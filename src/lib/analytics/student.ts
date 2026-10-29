import "server-only";
import { db } from "@/lib/db";
import {
  attemptTrend,
  bySection,
  byDifficulty,
  momentum,
  pacing,
  strongestTopics,
  tally,
  weakestTopics,
  type ScoredResponse,
} from "./compute";

/** Every scored response for a signed-in student, newest attempt data included. */
export async function loadScoredResponses(userId: string): Promise<ScoredResponse[]> {
  const rows = await db.response.findMany({
    where: {
      attempt: { userId, status: "SUBMITTED" },
      isCorrect: { not: null },
    },
    select: {
      questionId: true,
      attemptId: true,
      isCorrect: true,
      timeSpentMs: true,
      updatedAt: true,
      question: {
        select: {
          section: true,
          difficulty: true,
          topics: { select: { topic: { select: { slug: true } } } },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: 20_000,
  });
  return rows.map((r) => ({
    questionId: r.questionId,
    attemptId: r.attemptId,
    section: r.question.section,
    topics: r.question.topics.map((t) => t.topic.slug),
    isCorrect: r.isCorrect === true,
    timeSpentMs: r.timeSpentMs,
    difficulty: r.question.difficulty,
    answeredAt: r.updatedAt,
  }));
}

export async function getStudentAnalytics(userId: string) {
  const rows = await loadScoredResponses(userId);
  const trend = attemptTrend(rows);
  const slugs = [...new Set(rows.flatMap((r) => r.topics))];
  const names = new Map(
    (await db.topic.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } })).map((t) => [t.slug, t.name]),
  );
  const named = <T extends { topic: string }>(list: T[]) => list.map((t) => ({ ...t, name: names.get(t.topic) ?? t.topic }));
  return {
    overall: tally(rows),
    sections: bySection(rows),
    weakest: named(weakestTopics(rows)),
    strongest: named(strongestTopics(rows)),
    trend,
    momentum: momentum(trend),
    pacing: pacing(rows),
    difficulty: byDifficulty(rows),
    hasData: rows.length > 0,
  };
}

export type StudentAnalytics = Awaited<ReturnType<typeof getStudentAnalytics>>;

/** Recent submitted attempts for the history table. */
export async function getRecentAttempts(userId: string, limit = 10) {
  return db.attempt.findMany({
    where: { userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    take: limit,
    select: {
      id: true,
      mode: true,
      correctCount: true,
      totalCount: true,
      submittedAt: true,
      autoSubmitted: true,
      exam: { select: { title: true, slug: true, section: true } },
    },
  });
}
