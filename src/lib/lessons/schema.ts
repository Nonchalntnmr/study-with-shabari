import { z } from "zod";
import { choiceSchema, sectionEnum, topicSchema } from "@/lib/content/schema";

// The lesson file format (content/lessons/*.json). Like the question bank, `id`
// and `slug` fields are stable author keys: re-importing updates in place.

const key = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,80}$/, "use lowercase letters, digits and dashes");

const authorship = z.enum(["HUMAN", "AI"]);

export const misconceptionSchema = z.object({
  slug: key,
  topic: key.optional(),
  name: z.string().trim().min(3),
  description: z.string().trim().min(10),
  remediation: z.string().trim().min(10),
});

const lessonChoiceSchema = choiceSchema.extend({ misconception: key.optional() });

export const lessonQuestionSchema = z
  .object({
    id: key,
    section: sectionEnum,
    passage: z.object({ id: key, title: z.string().trim().min(1), body: z.string().trim().min(1), source: z.string().trim().optional() }).optional(),
    stem: z.string().trim().min(1),
    choices: z.array(lessonChoiceSchema).length(4),
    explanation: z.string().trim().min(1),
    topics: z.array(key).min(1),
    difficulty: z.number().int().min(1).max(5).optional(),
  })
  .superRefine((q, ctx) => {
    const correct = q.choices.filter((c) => c.correct).length;
    if (correct !== 1) ctx.addIssue({ code: "custom", message: `needs exactly one correct choice, has ${correct}`, path: ["choices"] });
    if (q.choices.map((c) => c.label).join() !== "A,B,C,D") ctx.addIssue({ code: "custom", message: "choice labels must be A, B, C, D in order", path: ["choices"] });
    q.choices.forEach((c, i) => {
      if (c.correct && c.misconception) ctx.addIssue({ code: "custom", message: "the correct choice can't reveal a misconception", path: ["choices", i, "misconception"] });
    });
  });

const stepSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("TEACH"), concept: key, title: z.string().trim().min(1), body: z.string().trim().min(1), figure: key.optional() }),
  z.object({ kind: z.literal("TEST"), concept: key, question: key }),
  z.object({ kind: z.literal("REMEDIATE"), concept: key, body: z.string().trim().min(1), title: z.string().trim().optional() }),
  z.object({ kind: z.literal("RETEST"), concept: key, question: key }),
]);

export const lessonFileSchema = z
  .object({
    version: z.literal(1),
    authoredBy: authorship,
    authorNote: z.string().optional(),
    lesson: z.object({
      slug: key,
      title: z.string().trim().min(3),
      section: sectionEnum.optional(),
      summary: z.string().trim().min(10),
      objectives: z.array(z.string().trim().min(3)).min(1),
    }),
    topics: z.array(topicSchema).default([]),
    misconceptions: z.array(misconceptionSchema).default([]),
    questions: z.array(lessonQuestionSchema).min(1),
    steps: z.array(stepSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const topics = new Set(file.topics.map((t) => t.slug));
    const misconceptions = new Set(file.misconceptions.map((m) => m.slug));
    const questions = new Set(file.questions.map((q) => q.id));
    if (questions.size !== file.questions.length) ctx.addIssue({ code: "custom", message: "duplicate question id", path: ["questions"] });
    file.misconceptions.forEach((m, i) => {
      if (m.topic && !topics.has(m.topic)) ctx.addIssue({ code: "custom", message: `unknown topic "${m.topic}"`, path: ["misconceptions", i, "topic"] });
    });
    file.questions.forEach((q, qi) => {
      q.topics.forEach((t) => {
        if (!topics.has(t)) ctx.addIssue({ code: "custom", message: `unknown topic "${t}"`, path: ["questions", qi, "topics"] });
      });
      q.choices.forEach((c, ci) => {
        if (c.misconception && !misconceptions.has(c.misconception)) {
          ctx.addIssue({ code: "custom", message: `unknown misconception "${c.misconception}"`, path: ["questions", qi, "choices", ci, "misconception"] });
        }
      });
    });
    file.steps.forEach((s, si) => {
      if ((s.kind === "TEST" || s.kind === "RETEST") && !questions.has(s.question)) {
        ctx.addIssue({ code: "custom", message: `unknown question "${s.question}"`, path: ["steps", si, "question"] });
      }
    });
  });

export type LessonFile = z.infer<typeof lessonFileSchema>;
