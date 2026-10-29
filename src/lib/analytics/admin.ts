import "server-only";
import { db } from "@/lib/db";
import { wilsonLowerBound } from "./compute";

const DAY = 86_400_000;

/** Platform-wide numbers for the admin overview. */
export async function getPlatformMetrics() {
  const since7 = new Date(Date.now() - 7 * DAY);
  const since30 = new Date(Date.now() - 30 * DAY);

  const [
    users,
    admins,
    newUsers7,
    attempts,
    attempts7,
    guestAttempts,
    submitted,
    autoSubmitted,
    inquiriesByStatus,
    publishedQuestions,
    draftQuestions,
    publishedExams,
    failedEmails,
    unsentEmails,
    activeUsers30,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { createdAt: { gte: since7 } } }),
    db.attempt.count(),
    db.attempt.count({ where: { startedAt: { gte: since7 } } }),
    db.attempt.count({ where: { userId: null } }),
    db.attempt.count({ where: { status: "SUBMITTED" } }),
    db.attempt.count({ where: { autoSubmitted: true } }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    db.question.count({ where: { status: "PUBLISHED" } }),
    db.question.count({ where: { status: { in: ["DRAFT", "REVIEW"] } } }),
    db.exam.count({ where: { status: "PUBLISHED" } }),
    db.emailMessage.count({ where: { status: "FAILED" } }),
    db.emailMessage.count({ where: { status: "NOT_CONFIGURED" } }),
    db.attempt
      .findMany({
        where: { startedAt: { gte: since30 }, userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
  ]);

  const inquiries = Object.fromEntries(inquiriesByStatus.map((g) => [g.status, g._count._all])) as Record<string, number>;

  return {
    users,
    admins,
    newUsers7,
    activeUsers30,
    attempts,
    attempts7,
    guestAttempts,
    submitted,
    completionRate: attempts > 0 ? submitted / attempts : null,
    autoSubmitted,
    inquiries: {
      NEW: inquiries.NEW ?? 0,
      IN_PROGRESS: inquiries.IN_PROGRESS ?? 0,
      RESOLVED: inquiries.RESOLVED ?? 0,
      SPAM: inquiries.SPAM ?? 0,
    },
    content: { publishedQuestions, draftQuestions, publishedExams },
    email: { failed: failedEmails, notConfigured: unsentEmails },
  };
}

export type PlatformMetrics = Awaited<ReturnType<typeof getPlatformMetrics>>;

/**
 * Question quality: which items students miss most, and which distractors draw
 * the wrong answers. Only items with enough responses are judged, and a high
 * miss rate is a prompt to review the item, not proof it is flawed.
 */
export async function getQuestionQuality(minResponses = 10, limit = 15) {
  const grouped = await db.response.groupBy({
    by: ["questionId"],
    where: { isCorrect: { not: null }, attempt: { status: "SUBMITTED" } },
    _count: { _all: true },
    _sum: { timeSpentMs: true },
  });
  const correct = await db.response.groupBy({
    by: ["questionId"],
    where: { isCorrect: true, attempt: { status: "SUBMITTED" } },
    _count: { _all: true },
  });
  const correctBy = new Map(correct.map((c) => [c.questionId, c._count._all]));

  const ranked = grouped
    .filter((g) => g._count._all >= minResponses)
    .map((g) => {
      const n = g._count._all;
      const c = correctBy.get(g.questionId) ?? 0;
      return {
        questionId: g.questionId,
        responses: n,
        accuracy: c / n,
        avgTimeSec: (g._sum.timeSpentMs ?? 0) / n / 1000,
        confidence: wilsonLowerBound(c, n),
      };
    })
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, limit);

  const questions = await db.question.findMany({
    where: { id: { in: ranked.map((r) => r.questionId) } },
    select: { id: true, stem: true, section: true, externalId: true, status: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  return ranked.flatMap((r) => {
    const q = byId.get(r.questionId);
    return q ? [{ ...r, stem: q.stem, section: q.section, externalId: q.externalId, status: q.status }] : [];
  });
}

/** Attempts started per day for the last `days` days, for the activity strip. */
export async function getDailyActivity(days = 14) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await db.attempt.findMany({
    where: { startedAt: { gte: since } },
    select: { startedAt: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.startedAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { day: d, attempts: counts.get(d) ?? 0 };
  });
}
