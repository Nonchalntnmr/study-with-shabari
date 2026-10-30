import type { PrismaClient } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";
import type { z } from "zod";
import { bankSchema, formatIssues, type Bank, type questionSchema } from "./schema";

type QuestionInput = z.infer<typeof questionSchema>;

// Kept free of "server-only" so the CLI script (scripts/import-content.ts) can use it.

export type ImportSummary = {
  topics: number;
  exams: number;
  passages: number;
  questions: number;
  status: ContentStatus;
};

export class ImportValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Content file is invalid:\n${issues.join("\n")}`);
  }
}

export function parseBank(input: unknown): Bank {
  const parsed = bankSchema.safeParse(input);
  if (!parsed.success) throw new ImportValidationError(formatIssues(parsed.error));
  return parsed.data;
}

/**
 * Upserts everything by stable id in one transaction. Choices are updated in
 * place by label, so answers students already gave keep pointing at them.
 * `status` applies to newly created rows and to rows being re-imported.
 */
export async function importBank(db: PrismaClient, input: unknown, status: ContentStatus = "DRAFT"): Promise<ImportSummary> {
  const bank = parseBank(input);
  const summary: ImportSummary = { topics: 0, exams: 0, passages: 0, questions: 0, status };

  await db.$transaction(
    async (tx) => {
      const topicIds = new Map<string, string>();
      for (const t of bank.topics) {
        const row = await tx.topic.upsert({
          where: { slug: t.slug },
          create: t,
          update: { name: t.name, section: t.section },
        });
        topicIds.set(t.slug, row.id);
        summary.topics++;
      }

      for (const exam of bank.exams) {
        const questionOrder: string[] = [];

        const upsertQuestion = async (qq: QuestionInput, passageId: string | null) => {
          const data = {
            section: exam.section,
            passageId,
            stem: qq.stem,
            explanation: qq.explanation,
            difficulty: qq.difficulty ?? null,
            status,
          };
          const row = await tx.question.upsert({
            where: { externalId: qq.id },
            create: { externalId: qq.id, ...data },
            update: data,
          });
          for (const c of qq.choices) {
            await tx.choice.upsert({
              where: { questionId_label: { questionId: row.id, label: c.label } },
              create: { questionId: row.id, label: c.label, text: c.text, isCorrect: c.correct, rationale: c.rationale ?? null },
              update: { text: c.text, isCorrect: c.correct, rationale: c.rationale ?? null },
            });
          }
          const labels = qq.choices.map((c) => c.label);
          await tx.choice.deleteMany({ where: { questionId: row.id, label: { notIn: labels }, responses: { none: {} } } });
          await tx.questionTopic.deleteMany({ where: { questionId: row.id } });
          await tx.questionTopic.createMany({
            data: qq.topics.map((slug) => ({ questionId: row.id, topicId: topicIds.get(slug)! })),
          });
          questionOrder.push(row.id);
          summary.questions++;
        };

        for (const item of exam.items) {
          if (item.type === "passage") {
            const data = { section: exam.section, title: item.title, body: item.body, source: item.source ?? null, figureText: item.figure ?? null, status };
            const passage = await tx.passage.upsert({
              where: { externalId: item.id },
              create: { externalId: item.id, ...data },
              update: data,
            });
            summary.passages++;
            for (const q of item.questions) await upsertQuestion(q, passage.id);
          } else {
            await upsertQuestion(item, null);
          }
        }

        const examData = {
          title: exam.title,
          description: exam.description,
          section: exam.section,
          timeLimitSec: exam.timeLimitMinutes * 60,
          isSample: exam.isSample,
          underReview: exam.underReview,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        };
        const examRow = await tx.exam.upsert({
          where: { slug: exam.slug },
          create: { slug: exam.slug, ...examData },
          update: examData,
        });
        await tx.examItem.deleteMany({ where: { examId: examRow.id } });
        await tx.examItem.createMany({
          data: questionOrder.map((questionId, position) => ({ examId: examRow.id, questionId, position })),
        });
        summary.exams++;
      }
    },
    { timeout: 60_000 },
  );

  return summary;
}
