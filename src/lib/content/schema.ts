import { z } from "zod";

// The content import format (docs/CONTENT_FORMAT.md). `id` fields are stable
// author-chosen keys: re-importing the same file updates content in place.

const key = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,80}$/, "use lowercase letters, digits and dashes");

export const sectionEnum = z.enum(["CP", "BB", "PS", "CARS"]);

export const choiceSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().trim().min(1),
  correct: z.boolean().default(false),
  rationale: z.string().trim().optional(),
});

export const questionSchema = z
  .object({
    id: key,
    stem: z.string().trim().min(1),
    choices: z.array(choiceSchema).length(4),
    explanation: z.string().trim().min(1),
    topics: z.array(key).min(1),
    difficulty: z.number().int().min(1).max(5).optional(),
  })
  .superRefine((q, ctx) => {
    const correct = q.choices.filter((c) => c.correct).length;
    if (correct !== 1) ctx.addIssue({ code: "custom", message: `needs exactly one correct choice, has ${correct}`, path: ["choices"] });
    const labels = q.choices.map((c) => c.label);
    const expected = ["A", "B", "C", "D"].slice(0, labels.length);
    if (labels.join() !== expected.join()) {
      ctx.addIssue({ code: "custom", message: `choice labels must be ${expected.join(", ")} in order`, path: ["choices"] });
    }
  });

export const passageItemSchema = z.object({
  type: z.literal("passage"),
  id: key,
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  source: z.string().trim().optional(),
  questions: z.array(questionSchema).min(1),
});

export const discreteItemSchema = questionSchema.and(z.object({ type: z.literal("discrete") }));

export const examSchema = z.object({
  slug: key,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  section: sectionEnum,
  timeLimitMinutes: z.number().int().min(1).max(600),
  isSample: z.boolean().default(false),
  items: z.array(z.union([passageItemSchema, discreteItemSchema])).min(1),
});

export const topicSchema = z.object({ slug: key, name: z.string().trim().min(1), section: sectionEnum });

export const bankSchema = z
  .object({
    version: z.literal(1),
    topics: z.array(topicSchema).default([]),
    exams: z.array(examSchema).min(1),
  })
  .superRefine((bank, ctx) => {
    const known = new Set(bank.topics.map((t) => t.slug));
    const seen = new Set<string>();
    bank.exams.forEach((exam, ei) => {
      exam.items.forEach((item, ii) => {
        const qs = item.type === "passage" ? item.questions : [item];
        qs.forEach((q, qi) => {
          const path = item.type === "passage" ? ["exams", ei, "items", ii, "questions", qi] : ["exams", ei, "items", ii];
          if (seen.has(q.id)) ctx.addIssue({ code: "custom", message: `duplicate question id "${q.id}"`, path });
          seen.add(q.id);
          for (const t of q.topics) {
            if (!known.has(t)) ctx.addIssue({ code: "custom", message: `unknown topic "${t}"`, path: [...path, "topics"] });
          }
        });
      });
    });
  });

export type Bank = z.infer<typeof bankSchema>;

/** Human-readable list of problems, e.g. for the admin import screen. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}
