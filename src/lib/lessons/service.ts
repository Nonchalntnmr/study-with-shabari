import "server-only";
import { db } from "@/lib/db";
import { ownsAttempt, type Viewer } from "@/lib/exam/service";
import { countEvent } from "@/lib/funnel/record";
import { Prisma } from "@/generated/prisma/client";
import { furthestStep, grade, isQuestionStep, type ConfidenceLevel, type GivenAnswer } from "./flow";
import { previewAllowed } from "./preview";
import { buildSnapshot, type LessonSnapshot } from "./snapshot";

// Students only ever get an approved LessonVersion snapshot. Unapproved drafts
// render as previews where previewAllowed() says so, and are never counted in the funnel.

export type LessonMode = "published" | "preview";
export type ResolvedLesson = { lessonId: string; mode: LessonMode; versionId: string | null; snapshot: LessonSnapshot };

export class LessonError extends Error {
  constructor(public code: "not_found" | "invalid") {
    super(code);
  }
}

export async function findLesson(slug: string, isAdmin: boolean): Promise<ResolvedLesson | null> {
  const lesson = await db.lesson.findUnique({ where: { slug }, include: { publishedVersion: true } });
  if (!lesson) return null;
  if (lesson.publishedVersion && lesson.status !== "ARCHIVED") {
    return { lessonId: lesson.id, mode: "published", versionId: lesson.publishedVersion.id, snapshot: lesson.publishedVersion.snapshot as unknown as LessonSnapshot };
  }
  if (!previewAllowed(isAdmin)) return null;
  const snapshot = await buildSnapshot(db, lesson.id);
  return snapshot ? { lessonId: lesson.id, mode: "preview", versionId: null, snapshot } : null;
}

export async function startLessonAttempt(slug: string, owner: { userId: string | null; guestKeyHash: string | null }, isAdmin: boolean) {
  const lesson = await findLesson(slug, isAdmin);
  if (!lesson) throw new LessonError("not_found");
  const attempt = await db.lessonAttempt.create({
    data: {
      lessonVersionId: lesson.versionId,
      previewLessonId: lesson.mode === "preview" ? lesson.lessonId : null,
      userId: owner.userId,
      guestKeyHash: owner.userId ? null : owner.guestKeyHash,
    },
    select: { id: true },
  });
  if (lesson.mode === "published") await countEvent("lesson_started");
  return attempt;
}

/** An admin's run-through of a lesson's current draft (/admin/lessons/[id]/preview). Never counted in the funnel. */
export async function startPreviewAttempt(lessonId: string, adminUserId: string) {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new LessonError("not_found");
  return db.lessonAttempt.create({ data: { lessonVersionId: null, previewLessonId: lesson.id, userId: adminUserId, guestKeyHash: null }, select: { id: true } });
}

export type LoadedAttempt = {
  id: string;
  mode: LessonMode;
  snapshot: LessonSnapshot;
  answers: GivenAnswer[];
  answered: Set<number>;
  completedAt: Date | null;
};

export async function loadLessonAttempt(attemptId: string, viewer: Viewer): Promise<LoadedAttempt | null> {
  const attempt = await db.lessonAttempt.findUnique({
    where: { id: attemptId },
    include: { lessonVersion: true, answers: { orderBy: { stepPosition: "asc" } } },
  });
  if (!attempt || !ownsAttempt(attempt, viewer)) return null;

  let snapshot: LessonSnapshot | null = null;
  let mode: LessonMode = "published";
  if (attempt.lessonVersion) {
    snapshot = attempt.lessonVersion.snapshot as unknown as LessonSnapshot;
  } else if (attempt.previewLessonId && previewAllowed(viewer.isAdmin)) {
    snapshot = await buildSnapshot(db, attempt.previewLessonId);
    mode = "preview";
  }
  if (!snapshot) return null;

  const answers: GivenAnswer[] = attempt.answers.map((a) => ({
    stepPosition: a.stepPosition,
    choiceLabel: a.choiceLabel,
    confidence: a.confidence,
    isCorrect: a.isCorrect,
    misconceptionId: a.misconceptionId,
  }));
  return { id: attempt.id, mode, snapshot, answers, answered: new Set(answers.map((a) => a.stepPosition)), completedAt: attempt.completedAt };
}

const MAX_STEP_MS = 30 * 60 * 1000;

/**
 * Records the first answer to a question step, graded against the snapshot on
 * the server. The confidence rating arrives with the answer, before anything is
 * revealed. Answers can't be changed once given. Returns which lesson the attempt belongs to.
 */
export async function answerLessonStep(
  attemptId: string,
  viewer: Viewer,
  input: { position: number; choiceLabel: string; confidence: ConfidenceLevel; elapsedMs: number },
): Promise<{ lessonId: string; mode: LessonMode }> {
  const loaded = await loadLessonAttempt(attemptId, viewer);
  if (!loaded) throw new LessonError("not_found");
  const where = { lessonId: loaded.snapshot.lessonId, mode: loaded.mode };
  const step = loaded.snapshot.steps[input.position];
  if (!step || !isQuestionStep(step) || !step.question) throw new LessonError("invalid");
  if (loaded.answered.has(input.position)) return where;
  if (input.position > furthestStep(loaded.snapshot, loaded.answered)) throw new LessonError("invalid");
  const graded = grade(loaded.snapshot, step.question, input.choiceLabel);
  if (!graded) throw new LessonError("invalid");

  const timeMs = Math.max(0, Math.min(MAX_STEP_MS, input.elapsedMs));
  try {
    await db.lessonAnswer.create({
      data: {
        attemptId,
        stepPosition: input.position,
        questionId: step.question.id,
        choiceLabel: input.choiceLabel,
        confidence: input.confidence,
        isCorrect: graded.isCorrect,
        misconceptionId: graded.misconceptionId,
        timeMs,
      },
    });
  } catch (e) {
    // A double submit: the first answer stands.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return where;
    throw e;
  }

  const published = loaded.mode === "published";
  if (published) await countEvent("lesson_answered");
  const answered = new Set(loaded.answered).add(input.position);
  if (furthestStep(loaded.snapshot, answered) === loaded.snapshot.steps.length && !loaded.completedAt) {
    const done = await db.lessonAttempt.updateMany({ where: { id: attemptId, completedAt: null }, data: { completedAt: new Date() } });
    if (published && done.count > 0) await countEvent("lesson_completed");
  }
  return where;
}

/** Published practice sets in the given sections, for the result screen's next step. */
export async function practiceSetsFor(sections: string[]) {
  if (sections.length === 0) return [];
  return db.exam.findMany({
    where: { status: "PUBLISHED", section: { in: sections as Prisma.EnumSectionFilter["in"] } },
    orderBy: { title: "asc" },
    select: { slug: true, title: true, section: true },
    take: 3,
  });
}
