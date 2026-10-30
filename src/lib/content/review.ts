import type { PrismaClient } from "@/generated/prisma/client";

// Kept free of "server-only" so the CLI script (scripts/mark-exams-reviewed.ts) can use it.

export type ReviewSummary = { slug: string; wasUnderReview: boolean; questionsMarked: number }[];

/**
 * Records that Shabari has reviewed whole practice sets: clears the sets' "being reviewed" label and
 * stamps reviewedAt/reviewedById on their questions that have no review yet, with one AuditLog row per
 * set. Status, content, versions, attempts and responses are left alone, so pinned attempts don't change.
 */
export async function markExamsReviewed(
  db: PrismaClient,
  slugs: string[],
  actor: { id: string; email: string },
  note: string,
): Promise<ReviewSummary> {
  return db.$transaction(async (tx) => {
    const exams = await tx.exam.findMany({ where: { slug: { in: slugs } }, include: { items: { select: { questionId: true } } } });
    const missing = slugs.filter((s) => !exams.some((e) => e.slug === s));
    if (missing.length) throw new Error(`no such practice set: ${missing.join(", ")}`);

    const reviewedAt = new Date();
    const summary: ReviewSummary = [];
    for (const slug of slugs) {
      const exam = exams.find((e) => e.slug === slug)!;
      const { count } = await tx.question.updateMany({
        where: { id: { in: exam.items.map((i) => i.questionId) }, reviewedAt: null },
        data: { reviewedAt, reviewedById: actor.id },
      });
      if (exam.underReview) await tx.exam.update({ where: { id: exam.id }, data: { underReview: false } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: "exam.review",
          entityType: "Exam",
          entityId: exam.id,
          metadata: { slug, wasUnderReview: exam.underReview, questionsMarked: count, note },
        },
      });
      summary.push({ slug, wasUnderReview: exam.underReview, questionsMarked: count });
    }
    return summary;
  });
}
