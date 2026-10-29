import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Question versions: immutable copies of a question's student-facing content and
// answer key. Attempts are pinned to the versions current when they start, and
// grading and review read the pinned copy, so editing a published question never
// changes an attempt in progress or a past result. Kept free of "server-only" so
// tests and scripts can use it.

type Db = PrismaClient | Prisma.TransactionClient;

export type VersionFigure = { assetId: string; alt: string; caption: string | null };
export type VersionChoice = {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  rationale: string | null;
  misconception: { id: string; name: string } | null;
};
export type VersionSnapshot = {
  schema: 1;
  section: string;
  stem: string;
  explanation: string;
  difficulty: number | null;
  figure: VersionFigure | null;
  passage: { id: string; title: string; body: string; source: string | null; figures: VersionFigure[] } | null;
  choices: VersionChoice[];
  topics: { slug: string; name: string }[];
};

/** Everything a snapshot needs, in one query. */
export const questionContentInclude = {
  choices: { orderBy: { label: "asc" }, include: { misconception: { select: { id: true, name: true } } } },
  topics: { include: { topic: { select: { slug: true, name: true } } } },
  figure: { select: { id: true, alt: true } },
  passage: { include: { figures: { include: { asset: { select: { id: true, alt: true } } }, orderBy: { position: "asc" } } } },
} satisfies Prisma.QuestionInclude;

export type QuestionWithContent = Prisma.QuestionGetPayload<{ include: typeof questionContentInclude }>;

/** Builds the snapshot with a fixed key and array order, so equal content always hashes the same. */
export function snapshotOf(q: QuestionWithContent): VersionSnapshot {
  return {
    schema: 1,
    section: q.section,
    stem: q.stem,
    explanation: q.explanation,
    difficulty: q.difficulty,
    figure: q.figure ? { assetId: q.figure.id, alt: q.figure.alt, caption: null } : null,
    passage: q.passage
      ? {
          id: q.passage.id,
          title: q.passage.title,
          body: q.passage.body,
          source: q.passage.source,
          figures: q.passage.figures.map((f) => ({ assetId: f.asset.id, alt: f.asset.alt, caption: f.caption })),
        }
      : null,
    choices: [...q.choices]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((c) => ({
        id: c.id,
        label: c.label,
        text: c.text,
        isCorrect: c.isCorrect,
        rationale: c.rationale,
        misconception: c.misconception ? { id: c.misconception.id, name: c.misconception.name } : null,
      })),
    topics: q.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })).sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

export function contentHash(s: VersionSnapshot): string {
  return createHash("sha256").update(JSON.stringify(s)).digest("hex");
}

export const correctChoiceId = (s: VersionSnapshot): string | null => s.choices.find((c) => c.isCorrect)?.id ?? null;

export type Attribution = { createdById?: string | null; reviewedById?: string | null; reviewedAt?: Date | null };

/**
 * Returns version ids for the questions' current content, in the given order,
 * creating a version only when the content hasn't been seen before. An
 * attribution fills reviewer fields that are still empty on a reused version.
 */
export async function pinVersions(db: Db, questionIds: string[], attribution: Attribution = {}): Promise<string[]> {
  if (questionIds.length === 0) return [];
  const questions = await db.question.findMany({ where: { id: { in: questionIds } }, include: questionContentInclude });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const wanted = questionIds.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Question ${id} not found`);
    const snapshot = snapshotOf(q);
    return { q, snapshot, hash: contentHash(snapshot) };
  });

  const find = () =>
    db.questionVersion.findMany({
      where: { OR: wanted.map((w) => ({ questionId: w.q.id, contentHash: w.hash })) },
      select: { id: true, questionId: true, contentHash: true, reviewedById: true },
    });
  let existing = await find();
  const key = (questionId: string, hash: string) => `${questionId}:${hash}`;
  let have = new Map(existing.map((v) => [key(v.questionId, v.contentHash), v]));

  const missing = wanted.filter((w) => !have.has(key(w.q.id, w.hash)));
  if (missing.length) {
    const latest = await db.questionVersion.groupBy({ by: ["questionId"], where: { questionId: { in: missing.map((m) => m.q.id) } }, _max: { version: true } });
    const next = new Map(latest.map((l) => [l.questionId, (l._max.version ?? 0) + 1]));
    // skipDuplicates: a concurrent start may have just created the same version.
    await db.questionVersion.createMany({
      skipDuplicates: true,
      data: missing.map((m) => {
        const version = next.get(m.q.id) ?? 1;
        next.set(m.q.id, version + 1);
        return {
          questionId: m.q.id,
          version,
          contentHash: m.hash,
          snapshot: m.snapshot as unknown as Prisma.InputJsonValue,
          authoredBy: m.q.authoredBy,
          reviewedById: attribution.reviewedById ?? m.q.reviewedById,
          reviewedAt: attribution.reviewedById ? (attribution.reviewedAt ?? new Date()) : m.q.reviewedAt,
          createdById: attribution.createdById ?? null,
        };
      }),
    });
    existing = await find();
    have = new Map(existing.map((v) => [key(v.questionId, v.contentHash), v]));
  }

  const ids = wanted.map((w) => {
    const v = have.get(key(w.q.id, w.hash));
    // Two concurrent writers can collide on a version number; the caller retries.
    if (!v) throw new VersionConflict();
    return v;
  });
  if (attribution.reviewedById) {
    const unattributed = ids.filter((v) => !v.reviewedById).map((v) => v.id);
    if (unattributed.length) await db.questionVersion.updateMany({ where: { id: { in: unattributed } }, data: { reviewedById: attribution.reviewedById, reviewedAt: attribution.reviewedAt ?? new Date() } });
  }
  return ids.map((v) => v.id);
}

export class VersionConflict extends Error {
  constructor() {
    super("Question version conflict; retry");
  }
}

/** pinVersions with one retry for the rare concurrent version-number collision. */
export async function pinVersionsWithRetry(db: Db, questionIds: string[], attribution: Attribution = {}): Promise<string[]> {
  try {
    return await pinVersions(db, questionIds, attribution);
  } catch (e) {
    if (e instanceof VersionConflict) return pinVersions(db, questionIds, attribution);
    throw e;
  }
}

export type PinnedQuestion = { questionId: string; versionId: string | null; version: number | null; snapshot: VersionSnapshot };

/**
 * The content an attempt is graded and reviewed against, in attempt order.
 * Attempts from before versioning have no pinned ids and read live content.
 */
export async function attemptContent(db: Db, attempt: { questionOrder: string[]; questionVersionIds: string[] }): Promise<PinnedQuestion[]> {
  const pinned = attempt.questionVersionIds.length === attempt.questionOrder.length && attempt.questionOrder.length > 0;
  if (pinned) {
    const rows = await db.questionVersion.findMany({ where: { id: { in: attempt.questionVersionIds } }, select: { id: true, questionId: true, version: true, snapshot: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return attempt.questionVersionIds.flatMap((vid, i) => {
      const r = byId.get(vid);
      return r && r.questionId === attempt.questionOrder[i] ? [{ questionId: r.questionId, versionId: r.id, version: r.version, snapshot: r.snapshot as unknown as VersionSnapshot }] : [];
    });
  }
  const live = await db.question.findMany({ where: { id: { in: attempt.questionOrder } }, include: questionContentInclude });
  const byId = new Map(live.map((q) => [q.id, q]));
  return attempt.questionOrder.flatMap((id) => {
    const q = byId.get(id);
    return q ? [{ questionId: id, versionId: null, version: null, snapshot: snapshotOf(q) }] : [];
  });
}

// ------------------------------------------------------------------ history

/** Student-visible fields that differ between two versions, for the admin history. */
export function changedFields(before: VersionSnapshot | null, after: VersionSnapshot): string[] {
  if (!before) return ["First version"];
  const out: string[] = [];
  if (before.stem !== after.stem) out.push("Question stem");
  if (before.explanation !== after.explanation) out.push("Explanation");
  if (before.difficulty !== after.difficulty) out.push("Difficulty");
  if (JSON.stringify(before.passage) !== JSON.stringify(after.passage)) out.push("Passage");
  if (JSON.stringify(before.figure) !== JSON.stringify(after.figure)) out.push("Figure");
  const correct = (s: VersionSnapshot) => s.choices.find((c) => c.isCorrect)?.label ?? null;
  if (correct(before) !== correct(after)) out.push(`Answer key (${correct(before) ?? "none"} → ${correct(after) ?? "none"})`);
  for (const c of after.choices) {
    const b = before.choices.find((x) => x.label === c.label);
    if (!b || b.text !== c.text) out.push(`Choice ${c.label}`);
    if (!b || b.rationale !== c.rationale) out.push(`Choice ${c.label} rationale`);
    if ((b?.misconception?.id ?? null) !== (c.misconception?.id ?? null) || b?.misconception?.name !== c.misconception?.name) out.push(`Choice ${c.label} misconception`);
  }
  if (JSON.stringify(before.topics) !== JSON.stringify(after.topics)) out.push("Topics");
  return out.length ? out : ["No student-visible change"];
}
