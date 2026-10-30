import type { PrismaClient } from "@/generated/prisma/client";
import { formatIssues } from "@/lib/content/schema";
import { lessonFileSchema, type LessonFile } from "./schema";

// Kept free of "server-only" so scripts (seed, import-lesson) can use it.

export class LessonValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Lesson file is invalid:\n${issues.join("\n")}`);
  }
}

export function parseLessonFile(input: unknown): LessonFile {
  const parsed = lessonFileSchema.safeParse(input);
  if (!parsed.success) throw new LessonValidationError(formatIssues(parsed.error));
  return parsed.data;
}

export type LessonImportSummary = { lessonId: string; misconceptions: number; questions: number; steps: number };

/**
 * Imports a lesson file as an unpublished draft (status REVIEW). Importing
 * always clears earlier review stamps on its questions, because the content may
 * have changed: a human has to approve again. Students keep seeing the last
 * approved LessonVersion snapshot until then.
 */
export async function importLesson(db: PrismaClient, input: unknown): Promise<LessonImportSummary> {
  const file = parseLessonFile(input);
  const authoredBy = file.authoredBy;

  return db.$transaction(
    async (tx) => {
      const topicIds = new Map<string, string>();
      for (const t of file.topics) {
        // Existing topics keep the names admins gave them.
        const row = await tx.topic.upsert({ where: { slug: t.slug }, create: t, update: {} });
        topicIds.set(t.slug, row.id);
      }

      const misconceptionIds = new Map<string, string>();
      for (const m of file.misconceptions) {
        const data = { name: m.name, description: m.description, remediation: m.remediation, topicId: m.topic ? topicIds.get(m.topic)! : null, authoredBy };
        const row = await tx.misconception.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
        misconceptionIds.set(m.slug, row.id);
      }

      const questionIds = new Map<string, string>();
      for (const q of file.questions) {
        let passageId: string | null = null;
        if (q.passage) {
          const data = { section: q.section, title: q.passage.title, body: q.passage.body, source: q.passage.source ?? null, status: "REVIEW" as const };
          passageId = (await tx.passage.upsert({ where: { externalId: q.passage.id }, create: { externalId: q.passage.id, ...data }, update: data })).id;
        }
        const data = {
          section: q.section,
          passageId,
          stem: q.stem,
          explanation: q.explanation,
          difficulty: q.difficulty ?? null,
          status: "REVIEW" as const,
          authoredBy,
          reviewedById: null,
          reviewedAt: null,
        };
        const row = await tx.question.upsert({ where: { externalId: q.id }, create: { externalId: q.id, ...data }, update: data });
        for (const c of q.choices) {
          const choice = {
            text: c.text,
            isCorrect: c.correct,
            rationale: c.rationale ?? null,
            misconceptionId: c.misconception ? misconceptionIds.get(c.misconception)! : null,
          };
          await tx.choice.upsert({
            where: { questionId_label: { questionId: row.id, label: c.label } },
            create: { questionId: row.id, label: c.label, ...choice },
            update: choice,
          });
        }
        await tx.questionTopic.deleteMany({ where: { questionId: row.id } });
        await tx.questionTopic.createMany({ data: q.topics.map((slug) => ({ questionId: row.id, topicId: topicIds.get(slug)! })) });
        questionIds.set(q.id, row.id);
      }

      const lessonData = {
        title: file.lesson.title,
        section: file.lesson.section ?? null,
        summary: file.lesson.summary,
        objectives: file.lesson.objectives,
        status: "REVIEW" as const,
        authoredBy,
      };
      const lesson = await tx.lesson.upsert({ where: { slug: file.lesson.slug }, create: { slug: file.lesson.slug, ...lessonData }, update: lessonData });

      await tx.lessonStep.deleteMany({ where: { lessonId: lesson.id } });
      await tx.lessonStep.createMany({
        data: file.steps.map((s, position) => ({
          lessonId: lesson.id,
          position,
          kind: s.kind,
          concept: s.concept,
          title: "title" in s ? (s.title ?? null) : null,
          body: "body" in s ? s.body : null,
          figure: s.kind === "TEACH" ? (s.figure ?? null) : null,
          questionId: "question" in s ? questionIds.get(s.question)! : null,
        })),
      });

      return { lessonId: lesson.id, misconceptions: file.misconceptions.length, questions: file.questions.length, steps: file.steps.length };
    },
    { timeout: 60_000 },
  );
}
