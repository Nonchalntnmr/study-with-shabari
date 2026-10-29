import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser, getGuestKeyHash } from "@/lib/auth/session";
import { assetUrl } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeRanges, splitParagraphs, type HighlightRange } from "./passage";
import type { SyncPayload, startInput } from "./schemas";
import { scoreAttempt, topicBreakdown } from "./scoring";
import { acceptsWrites, clampTimeSpent, computeDeadline, isExpired } from "./timing";
import type { RunnerPassage, RunnerQuestion, RunnerResponse, RunnerState, SyncResult } from "./types";
import type { z } from "zod";

type Tx = Prisma.TransactionClient;

export type Viewer = { userId: string | null; guestKeyHash: string | null; isAdmin: boolean };

export class AttemptError extends Error {
  constructor(
    public code: "not_found" | "invalid" | "unavailable",
    message: string = code,
  ) {
    super(message);
  }
}

export async function getViewer(): Promise<Viewer> {
  const [user, guestKeyHash] = await Promise.all([getCurrentUser(), getGuestKeyHash()]);
  return { userId: user?.id ?? null, guestKeyHash, isAdmin: user?.role === "ADMIN" };
}

/** Account attempts belong to the account; guest attempts to the browser's guest key. */
export function ownsAttempt(a: { userId: string | null; guestKeyHash: string | null }, v: Viewer): boolean {
  if (a.userId) return a.userId === v.userId;
  return a.guestKeyHash !== null && a.guestKeyHash === v.guestKeyHash;
}

// ------------------------------------------------------------------ start

export async function startAttempt(
  input: z.infer<typeof startInput>,
  owner: { userId: string | null; guestKeyHash: string | null },
  isAdmin = false,
) {
  const exam = await db.exam.findUnique({
    where: { id: input.examId },
    include: { items: { orderBy: { position: "asc" }, select: { questionId: true } } },
  });
  // Admins may start unpublished exams to preview them.
  if (!exam || (exam.status !== "PUBLISHED" && !isAdmin)) throw new AttemptError("not_found");
  if (exam.items.length === 0) throw new AttemptError("unavailable", "This exam has no questions yet.");

  const startedAt = new Date();
  return db.attempt.create({
    data: {
      examId: exam.id,
      userId: owner.userId,
      guestKeyHash: owner.userId ? null : owner.guestKeyHash,
      mode: input.mode,
      questionOrder: exam.items.map((i) => i.questionId),
      startedAt,
      deadlineAt: computeDeadline(input.mode, startedAt, exam.timeLimitSec),
    },
    select: { id: true },
  });
}

// ------------------------------------------------------------------ runner

type LoadResult = { kind: "ok"; state: RunnerState } | { kind: "submitted" } | { kind: "not_found" };

export async function loadRunnerState(attemptId: string, viewer: Viewer): Promise<LoadResult> {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { title: true, section: true, slug: true } }, responses: true, highlights: true },
  });
  if (!attempt || !ownsAttempt(attempt, viewer)) return { kind: "not_found" };
  if (attempt.status === "SUBMITTED") return { kind: "submitted" };
  if (isExpired(attempt, Date.now())) {
    await submitAttempt(attemptId, viewer);
    return { kind: "submitted" };
  }

  const questions = await db.question.findMany({
    where: { id: { in: attempt.questionOrder } },
    include: {
      choices: { orderBy: { label: "asc" }, select: { id: true, label: true, text: true } },
      figure: true,
      passage: { include: { figures: { include: { asset: true }, orderBy: { position: "asc" } } } },
    },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  const runnerQuestions: RunnerQuestion[] = [];
  const passages: Record<string, RunnerPassage> = {};
  for (const qid of attempt.questionOrder) {
    const q = byId.get(qid);
    if (!q) continue;
    if (q.passage && !passages[q.passage.id]) {
      passages[q.passage.id] = {
        id: q.passage.id,
        title: q.passage.title,
        paragraphs: splitParagraphs(q.passage.body),
        source: q.passage.source,
        figures: q.passage.figures.map((f) => ({
          id: f.id,
          url: assetUrl(f.asset),
          alt: f.asset.alt,
          caption: f.caption,
        })),
      };
    }
    runnerQuestions.push({
      id: q.id,
      number: runnerQuestions.length + 1,
      passageId: q.passageId,
      stem: q.stem,
      figure: q.figure ? { id: q.figure.id, url: assetUrl(q.figure), alt: q.figure.alt, caption: null } : null,
      choices: q.choices,
    });
  }

  const responses: Record<string, RunnerResponse> = {};
  for (const r of attempt.responses) {
    responses[r.questionId] = {
      selectedChoiceId: r.selectedChoiceId,
      eliminatedChoiceIds: r.eliminatedChoiceIds,
      flagged: r.flagged,
      timeSpentMs: r.timeSpentMs,
    };
  }
  const highlights: Record<string, HighlightRange[]> = {};
  for (const h of attempt.highlights) highlights[h.passageId] = h.ranges as HighlightRange[];

  return {
    kind: "ok",
    state: {
      attemptId: attempt.id,
      exam: attempt.exam,
      mode: attempt.mode,
      startedAt: attempt.startedAt.toISOString(),
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      serverNow: new Date().toISOString(),
      lastPosition: Math.min(attempt.lastPosition, Math.max(0, runnerQuestions.length - 1)),
      questions: runnerQuestions,
      passages,
      responses,
      highlights,
    },
  };
}

// ------------------------------------------------------------------ autosave

/** Row lock serializes autosave and submit for one attempt. */
async function lockAttempt(tx: Tx, attemptId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Attempt" WHERE "id" = ${attemptId} FOR UPDATE`;
  return tx.attempt.findUnique({ where: { id: attemptId } });
}

export async function syncAttempt(attemptId: string, viewer: Viewer, payload: SyncPayload): Promise<SyncResult> {
  const result = await db.$transaction(async (tx): Promise<SyncResult | "expired"> => {
    const attempt = await lockAttempt(tx, attemptId);
    if (!attempt || !ownsAttempt(attempt, viewer)) throw new AttemptError("not_found");
    if (attempt.status === "SUBMITTED") return { ok: false, status: "SUBMITTED", reason: "already_submitted" };
    const now = Date.now();
    if (!acceptsWrites(attempt, now)) {
      await scoreAndClose(tx, attempt.id, true);
      return "expired";
    }

    const inAttempt = new Set(attempt.questionOrder);
    for (const r of payload.responses) {
      if (!inAttempt.has(r.questionId)) throw new AttemptError("invalid", "Question is not part of this attempt.");
    }

    if (payload.responses.length) {
      const qids = payload.responses.map((r) => r.questionId);
      const [choices, existing] = await Promise.all([
        tx.choice.findMany({ where: { questionId: { in: qids } }, select: { id: true, questionId: true } }),
        tx.response.findMany({
          where: { attemptId, questionId: { in: qids } },
          select: { questionId: true, timeSpentMs: true },
        }),
      ]);
      const choiceOwner = new Map(choices.map((c) => [c.id, c.questionId]));
      const prevTime = new Map(existing.map((e) => [e.questionId, e.timeSpentMs]));

      for (const r of payload.responses) {
        const belongs = (cid: string) => choiceOwner.get(cid) === r.questionId;
        if (r.selectedChoiceId && !belongs(r.selectedChoiceId)) throw new AttemptError("invalid", "Unknown choice.");
        const data = {
          selectedChoiceId: r.selectedChoiceId,
          eliminatedChoiceIds: [...new Set(r.eliminatedChoiceIds)].filter(belongs),
          flagged: r.flagged,
          timeSpentMs: clampTimeSpent(r.timeSpentMs, prevTime.get(r.questionId) ?? 0, attempt.startedAt, now),
        };
        await tx.response.upsert({
          where: { attemptId_questionId: { attemptId, questionId: r.questionId } },
          create: { attemptId, questionId: r.questionId, ...data },
          update: data,
        });
      }
    }

    if (payload.highlights.length) {
      const passageRows = await tx.passage.findMany({
        where: { questions: { some: { id: { in: attempt.questionOrder } } } },
        select: { id: true, body: true },
      });
      const paragraphLengths = new Map(passageRows.map((p) => [p.id, splitParagraphs(p.body).map((t) => t.length)]));
      for (const h of payload.highlights) {
        const lengths = paragraphLengths.get(h.passageId);
        if (!lengths) throw new AttemptError("invalid", "Passage is not part of this attempt.");
        const ranges = normalizeRanges(h.ranges, lengths);
        await tx.passageHighlight.upsert({
          where: { attemptId_passageId: { attemptId, passageId: h.passageId } },
          create: { attemptId, passageId: h.passageId, ranges },
          update: { ranges },
        });
      }
    }

    if (payload.lastPosition !== undefined) {
      await tx.attempt.update({
        where: { id: attemptId },
        data: { lastPosition: Math.min(payload.lastPosition, attempt.questionOrder.length - 1) },
      });
    }

    return {
      ok: true,
      status: "IN_PROGRESS",
      serverNow: new Date().toISOString(),
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    };
  });

  return result === "expired" ? { ok: false, status: "SUBMITTED", reason: "time_expired" } : result;
}

// ------------------------------------------------------------------ submit

async function scoreAndClose(tx: Tx, attemptId: string, auto: boolean) {
  const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId }, include: { responses: true } });
  const questions = await tx.question.findMany({
    where: { id: { in: attempt.questionOrder } },
    select: { id: true, choices: { where: { isCorrect: true }, select: { id: true } } },
  });
  const correctById = new Map(questions.map((q) => [q.id, q.choices[0]?.id ?? null]));
  const { items, correct, total } = scoreAttempt(
    attempt.questionOrder
      .filter((id) => correctById.has(id))
      .map((id) => ({ id, correctChoiceId: correctById.get(id) ?? null, topics: [] })),
    attempt.responses,
  );

  const existing = new Set(attempt.responses.map((r) => r.questionId));
  const right = items.filter((i) => i.isCorrect).map((i) => i.questionId);
  const wrong = items.filter((i) => !i.isCorrect).map((i) => i.questionId);
  await tx.response.updateMany({ where: { attemptId, questionId: { in: right } }, data: { isCorrect: true } });
  await tx.response.updateMany({ where: { attemptId, questionId: { in: wrong } }, data: { isCorrect: false } });
  const missing = items.filter((i) => !existing.has(i.questionId));
  if (missing.length) {
    await tx.response.createMany({
      data: missing.map((i) => ({ attemptId, questionId: i.questionId, isCorrect: false, eliminatedChoiceIds: [] })),
    });
  }

  // An attempt that ran out of time ended at its deadline, not when we noticed.
  const now = new Date();
  const endedAt = auto && attempt.deadlineAt && attempt.deadlineAt < now ? attempt.deadlineAt : now;
  await tx.attempt.update({
    where: { id: attemptId },
    data: { status: "SUBMITTED", submittedAt: endedAt, autoSubmitted: auto, correctCount: correct, totalCount: total },
  });
}

/** Idempotent: submitting twice returns the first result. */
export async function submitAttempt(attemptId: string, viewer: Viewer): Promise<{ autoSubmitted: boolean }> {
  return db.$transaction(async (tx) => {
    const attempt = await lockAttempt(tx, attemptId);
    if (!attempt || !ownsAttempt(attempt, viewer)) throw new AttemptError("not_found");
    if (attempt.status === "SUBMITTED") return { autoSubmitted: attempt.autoSubmitted };
    const auto = isExpired(attempt, Date.now());
    await scoreAndClose(tx, attempt.id, auto);
    return { autoSubmitted: auto };
  });
}

// ------------------------------------------------------------------ results

export async function getResults(attemptId: string, viewer: Viewer) {
  const head = await db.attempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, guestKeyHash: true, status: true, mode: true, startedAt: true, deadlineAt: true },
  });
  const isOwner = head ? ownsAttempt(head, viewer) : false;
  if (!head || (!isOwner && !viewer.isAdmin)) return { kind: "not_found" as const };
  if (head.status !== "SUBMITTED") {
    if (!isOwner || !isExpired(head, Date.now())) return { kind: "in_progress" as const };
    await submitAttempt(attemptId, viewer);
  }

  const full = await db.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      exam: { select: { id: true, title: true, section: true, slug: true } },
      responses: true,
      highlights: true,
    },
  });
  const questions = await db.question.findMany({
    where: { id: { in: full.questionOrder } },
    include: {
      choices: { orderBy: { label: "asc" } },
      topics: { include: { topic: true } },
      passage: true,
      figure: true,
    },
  });
  const qById = new Map(questions.map((q) => [q.id, q]));
  const rById = new Map(full.responses.map((r) => [r.questionId, r]));

  const items = full.questionOrder
    .map((qid) => qById.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q, index) => {
      const r = rById.get(q.id);
      return {
        number: index + 1,
        questionId: q.id,
        passageId: q.passageId,
        stem: q.stem,
        explanation: q.explanation,
        figure: q.figure ? { url: assetUrl(q.figure), alt: q.figure.alt } : null,
        choices: q.choices.map((c) => ({
          id: c.id,
          label: c.label,
          text: c.text,
          isCorrect: c.isCorrect,
          rationale: c.rationale,
        })),
        selectedChoiceId: r?.selectedChoiceId ?? null,
        isCorrect: r?.isCorrect ?? false,
        flagged: r?.flagged ?? false,
        timeSpentMs: r?.timeSpentMs ?? 0,
        topics: q.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })),
      };
    });

  const highlightsByPassage = new Map(full.highlights.map((h) => [h.passageId, h.ranges as HighlightRange[]]));
  const passages: Record<string, { id: string; title: string; paragraphs: string[]; highlights: HighlightRange[] }> = {};
  for (const q of questions) {
    if (q.passage && !passages[q.passage.id]) {
      passages[q.passage.id] = {
        id: q.passage.id,
        title: q.passage.title,
        paragraphs: splitParagraphs(q.passage.body),
        highlights: highlightsByPassage.get(q.passage.id) ?? [],
      };
    }
  }

  const topics = topicBreakdown(
    items.map((i) => ({ id: i.questionId, correctChoiceId: null, topics: i.topics })),
    items.map((i) => ({ questionId: i.questionId, isCorrect: i.isCorrect })),
  );

  return {
    kind: "ok" as const,
    isOwner,
    results: {
      attemptId: full.id,
      exam: full.exam,
      mode: full.mode,
      startedAt: full.startedAt,
      submittedAt: full.submittedAt,
      autoSubmitted: full.autoSubmitted,
      correct: full.correctCount ?? items.filter((i) => i.isCorrect).length,
      total: full.totalCount ?? items.length,
      answered: items.filter((i) => i.selectedChoiceId).length,
      timeUsedMs: (full.submittedAt ?? new Date()).getTime() - full.startedAt.getTime(),
      items,
      passages,
      topics,
    },
  };
}

export type AttemptResults = Extract<Awaited<ReturnType<typeof getResults>>, { kind: "ok" }>["results"];
