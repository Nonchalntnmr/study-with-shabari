"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { publishLesson } from "@/lib/lessons/publish";
import { PUBLIC_TAGS } from "@/lib/public-data";
import { audit } from "@/lib/security/audit";
import type { ActionResult } from "./actions";

// Lesson editing changes only the draft. Students keep seeing the approved
// LessonVersion until an admin approves again. Every export re-checks admin and audits.

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const id = z.string().min(1).max(64);
const text = (max: number) => z.string().trim().max(max);

function parse<T extends z.ZodType>(schema: T, formData: FormData): { data: z.infer<T> } | { error: ActionResult } {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (r.success) return { data: r.data };
  const i = r.error.issues[0];
  return { error: fail(i ? `${i.path.join(".") || "form"}: ${i.message}` : "That request wasn't valid.") };
}

/** Any edit reopens review: the draft now differs from what was approved. */
async function markForReview(lessonIds: string[]) {
  if (lessonIds.length === 0) return;
  await db.lesson.updateMany({ where: { id: { in: lessonIds }, status: "PUBLISHED" }, data: { status: "REVIEW" } });
  for (const id of lessonIds) revalidatePath(`/admin/lessons/${id}`);
  revalidatePath("/admin/lessons");
  // Students keep the approved version, but a deployment that shows drafts (LESSON_PREVIEW) shows the edit at once.
  updateTag(PUBLIC_TAGS.lessons);
}

/** Lessons whose steps use a question with this choice or misconception: found in the database, not taken from the form. */
async function lessonsUsing(where: { choiceId: string } | { misconceptionId: string }): Promise<string[]> {
  const choiceFilter = "choiceId" in where ? { id: where.choiceId } : { misconceptionId: where.misconceptionId };
  const rows = await db.lesson.findMany({ where: { steps: { some: { question: { choices: { some: choiceFilter } } } } }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function updateLessonMeta(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, title: text(200).min(3, "Give the lesson a title."), summary: text(1000).min(10, "Write a one-line summary."), objectives: text(4000) }), formData);
  if ("error" in p) return p.error;
  const objectives = p.data.objectives.split("\n").map((o) => o.trim()).filter(Boolean);
  if (objectives.length === 0) return fail("List at least one learning objective, one per line.");
  const before = await db.lesson.findUnique({ where: { id: p.data.id }, select: { title: true, summary: true, objectives: true } });
  if (!before) return fail("Lesson not found.");
  await db.lesson.update({ where: { id: p.data.id }, data: { title: p.data.title, summary: p.data.summary, objectives } });
  await audit(admin, "lesson.update", "Lesson", p.data.id, { before, after: { title: p.data.title, summary: p.data.summary, objectives } });
  await markForReview([p.data.id]);
  return ok("Saved to the draft. Approve again to publish the change.");
}

export async function updateLessonStep(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, title: text(300).optional(), body: text(8000).min(1, "This step needs text.") }), formData);
  if ("error" in p) return p.error;
  const step = await db.lessonStep.findUnique({ where: { id: p.data.id }, select: { lessonId: true, kind: true, title: true, body: true } });
  if (!step) return fail("Step not found.");
  if (step.kind !== "TEACH" && step.kind !== "REMEDIATE") return fail("Edit question steps in the question editor.");
  const title = p.data.title === undefined ? step.title : p.data.title || null;
  await db.lessonStep.update({ where: { id: p.data.id }, data: { title, body: p.data.body } });
  await audit(admin, "lesson.step.update", "LessonStep", p.data.id, { lessonId: step.lessonId, before: { title: step.title, body: step.body }, after: { title, body: p.data.body } });
  await markForReview([step.lessonId]);
  return ok("Saved to the draft.");
}

export async function updateMisconception(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(
    z.object({
      id,
      name: text(200).min(3, "Name the misconception."),
      description: text(2000).min(10, "Describe the misconception."),
      remediation: text(4000).min(10, "Write the remediation a student sees."),
    }),
    formData,
  );
  if ("error" in p) return p.error;
  const before = await db.misconception.findUnique({ where: { id: p.data.id }, select: { name: true, description: true, remediation: true } });
  if (!before) return fail("Misconception not found.");
  const after = { name: p.data.name, description: p.data.description, remediation: p.data.remediation };
  await db.misconception.update({ where: { id: p.data.id }, data: after });
  const lessons = await lessonsUsing({ misconceptionId: p.data.id });
  await audit(admin, "misconception.update", "Misconception", p.data.id, { lessons, before, after });
  await markForReview(lessons);
  return ok("Saved to the draft.");
}

export async function mapChoiceMisconception(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ choiceId: id, misconceptionId: z.string().max(64) }), formData);
  if ("error" in p) return p.error;
  const choice = await db.choice.findUnique({ where: { id: p.data.choiceId }, select: { isCorrect: true, misconceptionId: true } });
  if (!choice) return fail("Choice not found.");
  const misconceptionId = p.data.misconceptionId || null;
  if (choice.isCorrect && misconceptionId) return fail("The correct choice can't reveal a misconception.");
  if (misconceptionId && !(await db.misconception.findUnique({ where: { id: misconceptionId }, select: { id: true } }))) return fail("Misconception not found.");
  await db.choice.update({ where: { id: p.data.choiceId }, data: { misconceptionId } });
  const lessons = await lessonsUsing({ choiceId: p.data.choiceId });
  await audit(admin, "choice.misconception", "Choice", p.data.choiceId, { lessons, before: choice.misconceptionId, after: misconceptionId });
  await markForReview(lessons);
  return ok("Mapping saved to the draft.");
}

export async function approveAndPublishLesson(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, attest: z.literal("on").optional() }), formData);
  if ("error" in p) return p.error;
  const result = await publishLesson(db, p.data.id, { id: admin.id, email: admin.email, role: admin.role }, p.data.attest === "on");
  if (!result.ok) return fail(result.problems.join(" "));
  updateTag(PUBLIC_TAGS.lessons);
  revalidatePath(`/admin/lessons/${p.data.id}`);
  revalidatePath("/admin/lessons");
  return ok(`Published as version ${result.version}. Students now see this version.`);
}
