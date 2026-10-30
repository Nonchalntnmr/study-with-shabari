import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser, getGuestKeyHash } from "@/lib/auth/session";
import { assetUrl } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeRanges, splitParagraphs, type HighlightRange } from "./passage";
import type { SyncPayload, startInput } from "./schemas";
import { difficultyBreakdown, scoreAttempt, topicBreakdown } from "./scoring";
import { LATE_DELIVERY_MS, acceptsWrites, clampTimeSpent, computeDeadline, inLateDelivery, isExpired, resolveChangedAt } from "./timing";
import type { RunnerFigure, RunnerPassage, RunnerQuestion, RunnerResponse, RunnerState, SubmitResult, SyncResult } from "./types";
import { attemptContent, correctChoiceId, pinVersionsWithRetry, type PinnedQuestion, type VersionFigure } from "./versions";
import type { z } from "zod";

type Tx = Prisma.TransactionClient;

export type Viewer = { userId: string | null; guestKeyHash: string | null; isAdmin: boolean };

export class AttemptError extends Error {
  constructor(
    // "signed_out": the attempt belongs to an account and this request has no session.
    public code: "not_found" | "invalid" | "unavailable" | "signed_out",
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

/** Throws the error a writer should see: signed out (recoverable by signing in) or not found. */
function assertOwner(a: { userId: string | null; guestKeyHash: string | null } | null, v: Viewer): asserts a {
  if (!a) throw new AttemptError("not_found");
  if (ownsAttempt(a, v)) return;
  if (a.userId && !v.userId) throw new AttemptError("signed_out", "Your session ended. Sign in again to keep saving.");
  throw new AttemptError("not_found");
}

// ------------------------------------------------------------------ start

export async function startAttempt(
  input: z.infer<typeof startInput>,
  owner: { userId: string | null; guestKeyHash: string | null },
  isAdmin = false,
) {
  const exam = await db.exam.findUnique({
    where: { slug: input.examSlug },
    include: { items: { orderBy: { position: "asc" }, select: { questionId: true } } },
  });
  // Admins may start unpublished exams to preview them.
  if (!exam || (exam.status !== "PUBLISHED" && !isAdmin)) throw new AttemptError("not_found");
  if (exam.items.length === 0) throw new AttemptError("unavailable", "This exam has no questions yet.");
  return createAttempt({
    examId: exam.id,
    owner,
    mode: input.mode,
    questionIds: exam.items.map((i) => i.questionId),
    timeLimitSec: exam.timeLimitSec,
  });
}

async function createAttempt(a: {
  examId: string;
  owner: { userId: string | null; guestKeyHash: string | null };
  mode: "TIMED" | "UNTIMED";
  questionIds: string[];
  timeLimitSec: number;
  retestOfId?: string;
}) {
  return db.$transaction(async (tx) => {
    // Pin the content now: later edits to these questions never reach this attempt.
    const questionVersionIds = await pinVersionsWithRetry(tx, a.questionIds);
    const startedAt = new Date();
    return tx.attempt.create({
      data: {
        examId: a.examId,
        userId: a.owner.userId,
        guestKeyHash: a.owner.userId ? null : a.owner.guestKeyHash,
        mode: a.mode,
        questionOrder: a.questionIds,
        questionVersionIds,
        retestOfId: a.retestOfId ?? null,
        startedAt,
        deadlineAt: computeDeadline(a.mode, startedAt, a.timeLimitSec),
      },
      select: { id: true },
    });
  });
}

/**
 * Retest the questions missed (or left blank) in a submitted attempt, untimed,
 * on their current versions. The new attempt links back to the original.
 */
export async function startRetest(attemptId: string, viewer: Viewer) {
  const original = await db.attempt.findUnique({ where: { id: attemptId }, include: { responses: { select: { questionId: true, isCorrect: true } } } });
  if (!original || !ownsAttempt(original, viewer)) throw new AttemptError("not_found");
  if (original.status !== "SUBMITTED") throw new AttemptError("unavailable", "Finish this set before retesting it.");
  const right = new Set(original.responses.filter((r) => r.isCorrect).map((r) => r.questionId));
  const missed = original.questionOrder.filter((id) => !right.has(id));
  if (missed.length === 0) throw new AttemptError("unavailable", "You got every question right, so there's nothing to retest.");
  return createAttempt({
    examId: original.examId,
    owner: { userId: original.userId, guestKeyHash: original.guestKeyHash },
    mode: "UNTIMED",
    questionIds: missed,
    timeLimitSec: 0,
    retestOfId: original.id,
  });
}

// ------------------------------------------------------------------ runner

type LoadResult = { kind: "ok"; state: RunnerState } | { kind: "submitted" } | { kind: "not_found" } | { kind: "signed_out" };

async function figureUrls(content: PinnedQuestion[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const c of content) {
    if (c.snapshot.figure) ids.add(c.snapshot.figure.assetId);
    for (const f of c.snapshot.passage?.figures ?? []) ids.add(f.assetId);
  }
  if (ids.size === 0) return new Map();
  const assets = await db.asset.findMany({ where: { id: { in: [...ids] } }, select: { id: true, provider: true, storageKey: true } });
  return new Map(assets.map((a) => [a.id, assetUrl(a)]));
}

const toFigure = (f: VersionFigure, urls: Map<string, string>, key: string): RunnerFigure | null => {
  const url = urls.get(f.assetId);
  return url ? { id: key, url, alt: f.alt, caption: f.caption } : null;
};

export async function loadRunnerState(attemptId: string, viewer: Viewer): Promise<LoadResult> {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { title: true, section: true, slug: true } }, responses: true, highlights: true, retestOf: { select: { id: true } } },
  });
  if (!attempt) return { kind: "not_found" };
  if (!ownsAttempt(attempt, viewer)) return attempt.userId && !viewer.userId ? { kind: "signed_out" } : { kind: "not_found" };
  if (attempt.status === "SUBMITTED") return { kind: "submitted" };
  const loadedAt = Date.now();
  // Just past the deadline, the page still opens so this browser can hand over answers
  // it made in time but couldn't save; it then submits straight away. Later, it closes here.
  const deliverOnly = isExpired(attempt, loadedAt) && inLateDelivery(attempt, loadedAt);
  if (isExpired(attempt, loadedAt) && !deliverOnly) {
    await submitAttempt(attemptId, viewer);
    return { kind: "submitted" };
  }

  const content = await attemptContent(db, attempt);
  const urls = await figureUrls(content);
  const runnerQuestions: RunnerQuestion[] = [];
  const passages: Record<string, RunnerPassage> = {};
  for (const { questionId, snapshot: s } of content) {
    if (s.passage && !passages[s.passage.id]) {
      passages[s.passage.id] = {
        id: s.passage.id,
        title: s.passage.title,
        paragraphs: splitParagraphs(s.passage.body),
        source: s.passage.source,
        figureText: s.passage.figureText ?? null,
        figures: s.passage.figures.flatMap((f, i) => toFigure(f, urls, `${s.passage!.id}-${i}`) ?? []),
      };
    }
    runnerQuestions.push({
      id: questionId,
      number: runnerQuestions.length + 1,
      passageId: s.passage?.id ?? null,
      stem: s.stem,
      figure: s.figure ? toFigure(s.figure, urls, `${questionId}-figure`) : null,
      // Only what the student needs: never the answer key, rationale or misconception.
      choices: s.choices.map((c) => ({ id: c.id, label: c.label, text: c.text })),
    });
  }

  const responses: Record<string, RunnerResponse> = {};
  for (const r of attempt.responses) {
    responses[r.questionId] = {
      selectedChoiceId: r.selectedChoiceId,
      eliminatedChoiceIds: r.eliminatedChoiceIds,
      flagged: r.flagged,
      timeSpentMs: r.timeSpentMs,
      changedAt: r.clientChangedAt?.getTime() ?? 0,
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
      isRetest: Boolean(attempt.retestOf),
      deliverOnly,
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

type LockedAttempt = NonNullable<Awaited<ReturnType<typeof lockAttempt>>>;

/**
 * Applies an autosave payload to a locked, writable attempt. Choices and
 * passages are checked against the attempt's pinned content. Each answer
 * carries the time the student made it, and an older change never replaces a
 * newer one, so a stale tab or an old offline backup can't undo later work.
 */
async function applyWrites(tx: Tx, attempt: LockedAttempt, payload: SyncPayload, now: number) {
  const inAttempt = new Set(attempt.questionOrder);
  for (const r of payload.responses) {
    if (!inAttempt.has(r.questionId)) throw new AttemptError("invalid", "Question is not part of this attempt.");
  }
  const needContent = payload.responses.length > 0 || payload.highlights.length > 0;
  const content = needContent ? await attemptContent(tx, attempt) : [];
  const choicesOf = new Map(content.map((c) => [c.questionId, new Set(c.snapshot.choices.map((x) => x.id))]));

  if (payload.responses.length) {
    const existing = await tx.response.findMany({
      where: { attemptId: attempt.id, questionId: { in: payload.responses.map((r) => r.questionId) } },
      select: { questionId: true, timeSpentMs: true, clientChangedAt: true },
    });
    const prev = new Map(existing.map((e) => [e.questionId, e]));

    for (const r of payload.responses) {
      const valid = choicesOf.get(r.questionId) ?? new Set<string>();
      if (r.selectedChoiceId && !valid.has(r.selectedChoiceId)) throw new AttemptError("invalid", "Unknown choice.");
      const before = prev.get(r.questionId);
      const timeSpentMs = clampTimeSpent(r.timeSpentMs, before?.timeSpentMs ?? 0, attempt.startedAt, now);
      const changedAt = resolveChangedAt(r.changedAt, attempt.startedAt.getTime(), now);
      const newer = !before?.clientChangedAt || changedAt >= before.clientChangedAt.getTime();
      const answer = {
        selectedChoiceId: r.selectedChoiceId,
        eliminatedChoiceIds: [...new Set(r.eliminatedChoiceIds)].filter((c) => valid.has(c)),
        flagged: r.flagged,
        clientChangedAt: new Date(changedAt),
      };
      await tx.response.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: r.questionId } },
        create: { attemptId: attempt.id, questionId: r.questionId, timeSpentMs, ...answer },
        // An older change still contributes time on the question, never its answer.
        update: newer ? { timeSpentMs, ...answer } : { timeSpentMs },
      });
    }
  }

  if (payload.highlights.length) {
    const lengths = new Map(
      content.flatMap((c) => (c.snapshot.passage ? [[c.snapshot.passage.id, splitParagraphs(c.snapshot.passage.body).map((t) => t.length)] as const] : [])),
    );
    for (const h of payload.highlights) {
      const paragraphLengths = lengths.get(h.passageId);
      if (!paragraphLengths) throw new AttemptError("invalid", "Passage is not part of this attempt.");
      const ranges = normalizeRanges(h.ranges, paragraphLengths);
      await tx.passageHighlight.upsert({
        where: { attemptId_passageId: { attemptId: attempt.id, passageId: h.passageId } },
        create: { attemptId: attempt.id, passageId: h.passageId, ranges },
        update: { ranges },
      });
    }
  }

  if (payload.lastPosition !== undefined) {
    await tx.attempt.update({
      where: { id: attempt.id },
      data: { lastPosition: Math.min(payload.lastPosition, attempt.questionOrder.length - 1) },
    });
  }
}

/** Only answers stamped before the deadline; highlights and position carry no timestamp, so they're dropped. */
function madeInTime(payload: SyncPayload, deadlineAt: Date): SyncPayload {
  return { responses: payload.responses.filter((r) => r.changedAt !== undefined && r.changedAt <= deadlineAt.getTime()), highlights: [] };
}

export async function syncAttempt(attemptId: string, viewer: Viewer, payload: SyncPayload): Promise<SyncResult> {
  const result = await db.$transaction(async (tx): Promise<SyncResult | "expired"> => {
    const attempt = await lockAttempt(tx, attemptId);
    assertOwner(attempt, viewer);
    if (attempt.status === "SUBMITTED") return { ok: false, status: "SUBMITTED", reason: "already_submitted" };
    const now = Date.now();
    if (!acceptsWrites(attempt, now)) {
      if (inLateDelivery(attempt, now)) await applyWrites(tx, attempt, madeInTime(payload, attempt.deadlineAt!), now);
      await scoreAndClose(tx, attempt, true);
      return "expired";
    }
    await applyWrites(tx, attempt, payload, now);
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

async function scoreAndClose(tx: Tx, attempt: LockedAttempt, auto: boolean) {
  const responses = await tx.response.findMany({ where: { attemptId: attempt.id } });
  const content = await attemptContent(tx, attempt);
  const { items, correct, total } = scoreAttempt(
    content.map((c) => ({ id: c.questionId, correctChoiceId: correctChoiceId(c.snapshot), topics: [] })),
    responses,
  );

  const existing = new Set(responses.map((r) => r.questionId));
  const right = items.filter((i) => i.isCorrect).map((i) => i.questionId);
  const wrong = items.filter((i) => !i.isCorrect).map((i) => i.questionId);
  await tx.response.updateMany({ where: { attemptId: attempt.id, questionId: { in: right } }, data: { isCorrect: true } });
  await tx.response.updateMany({ where: { attemptId: attempt.id, questionId: { in: wrong } }, data: { isCorrect: false } });
  const missing = items.filter((i) => !existing.has(i.questionId));
  if (missing.length) {
    await tx.response.createMany({
      data: missing.map((i) => ({ attemptId: attempt.id, questionId: i.questionId, isCorrect: false, eliminatedChoiceIds: [] })),
    });
  }

  // An attempt that ran out of time ended at its deadline, not when we noticed.
  const now = new Date();
  const endedAt = auto && attempt.deadlineAt && attempt.deadlineAt < now ? attempt.deadlineAt : now;
  await tx.attempt.update({
    where: { id: attempt.id },
    data: { status: "SUBMITTED", submittedAt: endedAt, autoSubmitted: auto, correctCount: correct, totalCount: total },
  });
}

/**
 * Submits an attempt, applying the browser's last unsaved changes in the same
 * locked transaction so nothing in flight is lost. Idempotent: submitting
 * twice returns the first result. A "timeout" submit (the browser's clock ran
 * out) is honored only when the server's deadline has actually passed;
 * otherwise the browser gets the real deadline back and carries on.
 */
export async function submitAttempt(
  attemptId: string,
  viewer: Viewer,
  opts: { payload?: SyncPayload; reason?: "manual" | "timeout" } = {},
): Promise<SubmitResult> {
  return db.$transaction(async (tx): Promise<SubmitResult> => {
    const attempt = await lockAttempt(tx, attemptId);
    assertOwner(attempt, viewer);
    if (attempt.status === "SUBMITTED") return { status: "submitted", autoSubmitted: attempt.autoSubmitted };
    const now = Date.now();
    if (opts.reason === "timeout" && attempt.deadlineAt && !isExpired(attempt, now)) {
      return { status: "not_expired", deadlineAt: attempt.deadlineAt.toISOString(), serverNow: new Date(now).toISOString() };
    }
    if (opts.payload && acceptsWrites(attempt, now)) await applyWrites(tx, attempt, opts.payload, now);
    else if (opts.payload && inLateDelivery(attempt, now)) await applyWrites(tx, attempt, madeInTime(opts.payload, attempt.deadlineAt!), now);
    const auto = isExpired(attempt, now);
    await scoreAndClose(tx, attempt, auto);
    return { status: "submitted", autoSubmitted: auto };
  });
}

/** Scores and closes timed attempts whose deadline (and late-delivery window) passed while nobody was looking. For the daily cron. */
export async function closeExpiredAttempts(now = new Date()): Promise<number> {
  const stale = await db.attempt.findMany({
    where: { status: "IN_PROGRESS", deadlineAt: { lt: new Date(now.getTime() - LATE_DELIVERY_MS - 60_000) } },
    select: { id: true },
    take: 500,
  });
  for (const { id } of stale) {
    await db.$transaction(async (tx) => {
      const attempt = await lockAttempt(tx, id);
      if (attempt && attempt.status === "IN_PROGRESS") await scoreAndClose(tx, attempt, true);
    });
  }
  return stale.length;
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
      retestOf: { select: { id: true, correctCount: true, totalCount: true, submittedAt: true } },
      retests: { where: { status: "SUBMITTED" }, orderBy: { submittedAt: "asc" }, select: { id: true, correctCount: true, totalCount: true, submittedAt: true } },
    },
  });
  const content = await attemptContent(db, full);
  const urls = await figureUrls(content);
  const rById = new Map(full.responses.map((r) => [r.questionId, r]));

  // Newer versions published since the student answered: shown as a note, never re-graded.
  const latest = await db.questionVersion.groupBy({ by: ["questionId"], where: { questionId: { in: full.questionOrder } }, _max: { version: true } });
  const latestById = new Map(latest.map((l) => [l.questionId, l._max.version ?? 0]));

  const items = content.map(({ questionId, version, snapshot: s }, index) => {
    const r = rById.get(questionId);
    const picked = s.choices.find((c) => c.id === r?.selectedChoiceId);
    return {
      number: index + 1,
      questionId,
      passageId: s.passage?.id ?? null,
      stem: s.stem,
      explanation: s.explanation,
      figure: s.figure && urls.get(s.figure.assetId) ? { url: urls.get(s.figure.assetId)!, alt: s.figure.alt } : null,
      choices: s.choices.map((c) => ({ id: c.id, label: c.label, text: c.text, isCorrect: c.isCorrect, rationale: c.rationale })),
      selectedChoiceId: r?.selectedChoiceId ?? null,
      isCorrect: r?.isCorrect ?? false,
      flagged: r?.flagged ?? false,
      timeSpentMs: r?.timeSpentMs ?? 0,
      topics: s.topics,
      difficulty: s.difficulty,
      // The misconception the chosen wrong answer reveals, when the author mapped one.
      misconception: picked && !picked.isCorrect ? picked.misconception?.name ?? null : null,
      revised: version !== null && (latestById.get(questionId) ?? 0) > version,
    };
  });

  const highlightsByPassage = new Map(full.highlights.map((h) => [h.passageId, h.ranges as HighlightRange[]]));
  const passages: Record<string, { id: string; title: string; paragraphs: string[]; highlights: HighlightRange[] }> = {};
  for (const { snapshot: s } of content) {
    if (s.passage && !passages[s.passage.id]) {
      passages[s.passage.id] = {
        id: s.passage.id,
        title: s.passage.title,
        paragraphs: splitParagraphs(s.passage.body),
        highlights: highlightsByPassage.get(s.passage.id) ?? [],
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
      difficulty: difficultyBreakdown(items),
      retestOf: full.retestOf,
      retests: full.retests,
    },
  };
}

export type AttemptResults = Extract<Awaited<ReturnType<typeof getResults>>, { kind: "ok" }>["results"];
