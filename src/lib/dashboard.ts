import "server-only";
import { db } from "@/lib/db";
import { getStudentAnalytics } from "@/lib/analytics/student";
import { sectionNames, type SectionCode } from "@/lib/site";
import { buildStudyPlan } from "@/lib/study-plan";

export async function getStudyPlan(userId: string) {
  const [user, analytics, exams, attempts] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { targetTestDate: true } }),
    getStudentAnalytics(userId),
    db.exam.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true, section: true } }),
    db.attempt.findMany({ where: { userId, status: "SUBMITTED" }, select: { examId: true, correctCount: true, totalCount: true } }),
  ]);
  const best = new Map<string, number>();
  for (const a of attempts) {
    const acc = a.totalCount ? (a.correctCount ?? 0) / a.totalCount : 0;
    best.set(a.examId, Math.max(best.get(a.examId) ?? 0, acc));
  }
  const plan = buildStudyPlan({
    today: new Date(),
    testDate: user.targetTestDate,
    sections: analytics.sections.map((s) => ({ section: s.section, answered: s.answered, accuracy: s.accuracy })),
    weakTopics: analytics.weakest.map((t) => ({ name: t.name, answered: t.answered, accuracy: t.accuracy })),
    exams: exams.map((e) => ({ slug: e.slug, title: e.title, section: e.section, attempted: best.has(e.id), bestAccuracy: best.get(e.id) ?? null })),
    sectionLabel: (c) => sectionNames[c as SectionCode] ?? c,
  });
  return { plan, testDate: user.targetTestDate, analytics };
}
