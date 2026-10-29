import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { approvalProblem, lessonPublishProblems } from "@/lib/admin/rules";
import { buildSnapshot, containsAi, forCheck } from "./snapshot";

// Approving a lesson: the only path from draft to what students see. Kept free
// of "server-only" so the guarded E2E fixture script goes through the same rules.

export type Approver = { id: string; email: string; role: string };
export type PublishResult = { ok: true; versionId: string; version: number } | { ok: false; problems: string[] };

export async function publishLesson(db: PrismaClient, lessonId: string, approver: Approver, attestedReview: boolean): Promise<PublishResult> {
  const draft = await buildSnapshot(db, lessonId);
  if (!draft) return { ok: false, problems: ["Lesson not found."] };

  const ai = containsAi(draft);
  const denied = approvalProblem({ approverRole: approver.role, authoredBy: ai ? "AI" : "HUMAN", attestedReview });
  if (denied) return { ok: false, problems: [denied] };
  const problems = lessonPublishProblems(forCheck(draft), attestedReview);
  if (problems.length > 0) return { ok: false, problems };

  const now = new Date();
  const questionIds = draft.steps.flatMap((s) => (s.question ? [s.question.id] : []));
  const passageIds = draft.steps.flatMap((s) => (s.question?.passage ? [s.question.passage.id] : []));

  return db.$transaction(async (tx) => {
    // The approval is the human review of every AI-drafted question in the lesson.
    await tx.question.updateMany({ where: { id: { in: questionIds }, authoredBy: "AI", reviewedById: null }, data: { reviewedById: approver.id, reviewedAt: now } });
    await tx.question.updateMany({ where: { id: { in: questionIds } }, data: { status: "PUBLISHED" } });
    await tx.passage.updateMany({ where: { id: { in: passageIds } }, data: { status: "PUBLISHED" } });

    // Snapshot after stamping, so the frozen copy records who reviewed each question.
    const snapshot = await buildSnapshot(tx, lessonId);
    const last = await tx.lessonVersion.findFirst({ where: { lessonId }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    const row = await tx.lessonVersion.create({
      data: { lessonId, version, snapshot: snapshot as unknown as Prisma.InputJsonValue, approvedById: approver.id, approvedAt: now },
    });
    await tx.lesson.update({ where: { id: lessonId }, data: { status: "PUBLISHED", publishedVersionId: row.id } });
    await tx.auditLog.create({
      data: {
        actorId: approver.id,
        actorEmail: approver.email,
        action: "lesson.publish",
        entityType: "Lesson",
        entityId: lessonId,
        metadata: { version, versionId: row.id, aiContent: ai, attestedReview, questions: questionIds.length },
      },
    });
    return { ok: true as const, versionId: row.id, version };
  });
}
