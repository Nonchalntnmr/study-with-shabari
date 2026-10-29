"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { ImportValidationError, importBank, parseBank } from "@/lib/content/import";
import { db } from "@/lib/db";
import { PUBLIC_TAGS } from "@/lib/public-data";
import { audit } from "@/lib/security/audit";
import { UploadError, storeImage } from "@/lib/storage";
import type { ActionResult } from "./actions";
import { contiguityProblem, ctaHrefProblem, httpsUrlProblem, insertPosition, moveItem, parseFeatures, slugProblem } from "./editor-rules";
import { questionPublishProblems } from "./rules";

// Every export is a public POST endpoint: each re-checks admin, validates, audits.

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

const id = z.string().min(1).max(64);
const section = z.enum(["CP", "BB", "PS", "CARS"]);
const contentStatus = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);
// Absent on create forms, "" for an empty <select>; both mean "none".
const optionalId = z.string().max(64).optional().transform((v) => (v ? v : null));
const text = (max: number) => z.string().trim().max(max);

function fields(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

function file(formData: FormData, name: string): File | null {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

function firstIssue(error: z.ZodError): string {
  const i = error.issues[0];
  return i ? `${i.path.join(".") || "form"}: ${i.message}` : "That request wasn't valid.";
}

// ------------------------------------------------------------------ questions

const LABELS = ["A", "B", "C", "D"] as const;

const questionSchema = z.object({
  id: optionalId,
  section,
  passageId: optionalId,
  stem: text(4000).min(5, "Write the question stem."),
  explanation: text(8000),
  difficulty: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]),
  correct: z.enum(LABELS, { error: "Mark the correct choice." }),
  figureAlt: text(300),
  removeFigure: z.string().optional(),
  choiceA: text(2000),
  choiceB: text(2000),
  choiceC: text(2000),
  choiceD: text(2000),
  rationaleA: text(2000),
  rationaleB: text(2000),
  rationaleC: text(2000),
  rationaleD: text(2000),
});

export async function saveQuestion(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = questionSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const choices = LABELS.map((label) => ({
    label,
    text: d[`choice${label}`],
    rationale: d[`rationale${label}`] || null,
    isCorrect: d.correct === label,
  }));
  if (choices.some((c) => !c.text)) return fail("Every choice A–D needs text.");

  const existing = d.id
    ? await db.question.findUnique({
        where: { id: d.id },
        select: { status: true, figureId: true, section: true, passageId: true, choices: { where: { isCorrect: true }, select: { label: true } }, _count: { select: { examItems: true } } },
      })
    : null;
  if (d.id && !existing) return fail("Question not found.");
  // Exams require one section and contiguous passage groups, so a question that's in an exam can't move.
  if (existing && existing._count.examItems > 0) {
    if (existing.section !== d.section) return fail("This question is in an exam, so its section can’t change. Remove it from the exam first.");
    if (existing.passageId !== d.passageId) return fail("This question is in an exam, so it can’t move to another passage. Remove it from the exam first.");
  }

  if (d.passageId) {
    const passage = await db.passage.findUnique({ where: { id: d.passageId }, select: { section: true, status: true } });
    if (!passage) return fail("That passage no longer exists.");
    if (passage.section !== d.section) return fail("The passage is from a different section.");
    if (existing?.status === "PUBLISHED" && passage.status !== "PUBLISHED") return fail("A published question can only use a published passage.");
  }

  const topicIds = formData.getAll("topics").filter((t): t is string => typeof t === "string");
  const topics = await db.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, section: true, name: true } });
  const wrongSection = topics.filter((t) => t.section !== d.section);
  if (wrongSection.length) return fail(`Topic “${wrongSection[0].name}” belongs to another section.`);

  if (existing?.status === "PUBLISHED") {
    const problems = questionPublishProblems({ stem: d.stem, explanation: d.explanation, choices });
    if (topics.length === 0) problems.push("Tag at least one topic.");
    if (problems.length) return fail(`This question is published, so it must stay complete: ${problems.join(" ")}`);
  }

  // Upload first so a failed upload changes nothing.
  let figureId: string | null | undefined = undefined;
  const upload = file(formData, "figure");
  if (upload) {
    if (!d.figureAlt) return fail("Describe the figure in the alt text box; students using screen readers rely on it.");
    try {
      figureId = (await storeImage(upload, d.figureAlt, admin.id)).id;
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message);
      throw e;
    }
  } else if (d.removeFigure === "1") {
    figureId = null;
  }

  const data = {
    section: d.section,
    passageId: d.passageId,
    stem: d.stem,
    explanation: d.explanation,
    difficulty: d.difficulty === "" ? null : d.difficulty,
    ...(figureId !== undefined ? { figureId } : {}),
  };

  const questionId = await db.$transaction(async (tx) => {
    const q = d.id ? await tx.question.update({ where: { id: d.id }, data }) : await tx.question.create({ data: { ...data, status: "DRAFT" } });
    // Updated in place by label: student answers reference these choice ids.
    for (const c of choices) {
      await tx.choice.upsert({
        where: { questionId_label: { questionId: q.id, label: c.label } },
        create: { questionId: q.id, ...c },
        update: { text: c.text, rationale: c.rationale, isCorrect: c.isCorrect },
      });
    }
    await tx.questionTopic.deleteMany({ where: { questionId: q.id } });
    if (topics.length) await tx.questionTopic.createMany({ data: topics.map((t) => ({ questionId: q.id, topicId: t.id })) });
    return q.id;
  });

  const previousKey = existing?.choices[0]?.label ?? null;
  await audit(admin, d.id ? "question.update" : "question.create", "Question", questionId, {
    section: d.section,
    // A changed answer key is legitimate (fixing a mistake) but must be traceable.
    ...(previousKey && previousKey !== d.correct ? { answerKeyChanged: { from: previousKey, to: d.correct } } : {}),
  });
  if (existing?.status === "PUBLISHED") updateTag(PUBLIC_TAGS.exams);
  revalidatePath("/admin/content");
  if (!d.id) redirect(`/admin/questions/${questionId}?created=1`);
  revalidatePath(`/admin/questions/${questionId}`);
  return ok("Question saved.");
}

// ------------------------------------------------------------------ passages

const passageSchema = z.object({
  id: optionalId,
  section,
  title: text(200).min(1, "Give the passage a title."),
  body: text(20000).min(1, "Paste the passage text."),
  source: text(500),
});

export async function savePassage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = passageSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const existing = d.id ? await db.passage.findUnique({ where: { id: d.id }, select: { status: true, section: true } }) : null;
  if (d.id && !existing) return fail("Passage not found.");
  if (existing && existing.section !== d.section && (await db.question.count({ where: { passageId: d.id! } })) > 0) {
    return fail("This passage already has questions, so its section can’t change.");
  }
  if (existing?.status === "PUBLISHED" && d.body.length < 50) return fail("A published passage can’t be shorter than 50 characters.");

  const data = { section: d.section, title: d.title, body: d.body, source: d.source || null };
  const passage = d.id ? await db.passage.update({ where: { id: d.id }, data }) : await db.passage.create({ data: { ...data, status: "DRAFT" } });
  await audit(admin, d.id ? "passage.update" : "passage.create", "Passage", passage.id);
  if (existing?.status === "PUBLISHED") updateTag(PUBLIC_TAGS.exams);
  revalidatePath("/admin/content");
  if (!d.id) redirect(`/admin/passages/${passage.id}?created=1`);
  revalidatePath(`/admin/passages/${passage.id}`);
  return ok("Passage saved.");
}

export async function addPassageFigure(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z.object({ passageId: id, alt: text(300).min(1, "Alt text is required."), caption: text(300) }).safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const upload = file(formData, "figure");
  if (!upload) return fail("Choose an image to upload.");
  if (!(await db.passage.findUnique({ where: { id: parsed.data.passageId }, select: { id: true } }))) return fail("Passage not found.");
  let assetId: string;
  try {
    assetId = (await storeImage(upload, parsed.data.alt, admin.id)).id;
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }
  const position = await db.passageFigure.count({ where: { passageId: parsed.data.passageId } });
  const fig = await db.passageFigure.create({
    data: { passageId: parsed.data.passageId, assetId, caption: parsed.data.caption || null, position },
  });
  await audit(admin, "passage.figure_add", "Passage", parsed.data.passageId, { figureId: fig.id });
  revalidatePath(`/admin/passages/${parsed.data.passageId}`);
  return ok("Figure added.");
}

export async function removePassageFigure(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z.object({ figureId: id }).safeParse(fields(formData));
  if (!parsed.success) return fail("That request wasn't valid.");
  const fig = await db.passageFigure.findUnique({ where: { id: parsed.data.figureId } });
  if (!fig) return fail("Figure not found.");
  await db.passageFigure.delete({ where: { id: fig.id } });
  await audit(admin, "passage.figure_remove", "Passage", fig.passageId, { figureId: fig.id });
  revalidatePath(`/admin/passages/${fig.passageId}`);
  return ok("Figure removed.");
}

// ------------------------------------------------------------------ exams

const examSchema = z.object({
  id: optionalId,
  title: text(200).min(1, "Give the exam a title."),
  slug: text(81),
  description: text(1000).min(1, "Add a one-line description."),
  section,
  timeLimitMinutes: z.coerce.number().int().min(1).max(600),
  isSample: z.string().optional(),
});

export async function saveExam(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = examSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const slugIssue = slugProblem(d.slug);
  if (slugIssue) return fail(slugIssue);

  const existing = d.id ? await db.exam.findUnique({ where: { id: d.id }, select: { status: true, section: true, _count: { select: { items: true } } } }) : null;
  if (d.id && !existing) return fail("Exam not found.");
  const clash = await db.exam.findUnique({ where: { slug: d.slug }, select: { id: true } });
  if (clash && clash.id !== d.id) return fail("Another exam already uses that slug.");
  if (existing && existing.section !== d.section && existing._count.items > 0) return fail("Remove the questions before changing the section.");

  const data = { title: d.title, slug: d.slug, description: d.description, section: d.section, timeLimitSec: d.timeLimitMinutes * 60, isSample: d.isSample === "on" };
  const exam = d.id ? await db.exam.update({ where: { id: d.id }, data }) : await db.exam.create({ data: { ...data, status: "DRAFT" } });
  await audit(admin, d.id ? "exam.update" : "exam.create", "Exam", exam.id, { slug: d.slug });
  if (existing?.status === "PUBLISHED") updateTag(PUBLIC_TAGS.exams);
  revalidatePath("/admin/content");
  if (!d.id) redirect(`/admin/exams/${exam.id}?created=1`);
  revalidatePath(`/admin/exams/${exam.id}`);
  return ok("Exam saved.");
}

async function loadItems(examId: string) {
  const items = await db.examItem.findMany({
    where: { examId },
    orderBy: { position: "asc" },
    select: { questionId: true, question: { select: { passageId: true, status: true } } },
  });
  return items.map((i) => ({ questionId: i.questionId, passageId: i.question.passageId, status: i.question.status }));
}

/** Rewrites the whole order so positions stay 0-based and contiguous. */
async function writeItems(examId: string, order: string[]) {
  await db.$transaction([
    db.examItem.deleteMany({ where: { examId } }),
    db.examItem.createMany({ data: order.map((questionId, position) => ({ examId, questionId, position })) }),
  ]);
}

export async function editExamItems(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ examId: id, questionId: id, op: z.enum(["add", "remove", "up", "down"]) })
    .safeParse(fields(formData));
  if (!parsed.success) return fail("Choose a question first.");
  const { examId, questionId, op } = parsed.data;

  const exam = await db.exam.findUnique({ where: { id: examId }, select: { status: true, section: true } });
  if (!exam) return fail("Exam not found.");
  let items = await loadItems(examId);
  const index = items.findIndex((i) => i.questionId === questionId);

  if (op === "add") {
    if (index !== -1) return fail("That question is already in this exam.");
    const q = await db.question.findUnique({ where: { id: questionId }, select: { section: true, passageId: true, status: true } });
    if (!q) return fail("Question not found.");
    if (q.section !== exam.section) return fail("That question is from a different section.");
    if (exam.status === "PUBLISHED" && q.status !== "PUBLISHED") return fail("This exam is live: publish the question before adding it.");
    const at = insertPosition(items, q.passageId);
    items = [...items.slice(0, at), { questionId, passageId: q.passageId, status: q.status }, ...items.slice(at)];
  } else {
    if (index === -1) return fail("That question isn’t in this exam.");
    if (op === "remove") {
      if (exam.status === "PUBLISHED" && items.length === 1) return fail("A published exam needs at least one question.");
      items = items.filter((i) => i.questionId !== questionId);
    } else {
      items = moveItem(items, index, op);
    }
  }

  const problem = contiguityProblem(items);
  if (problem) return fail(problem);
  await writeItems(examId, items.map((i) => i.questionId));
  await audit(admin, "exam.items", "Exam", examId, { op, questionId });
  if (exam.status === "PUBLISHED") updateTag(PUBLIC_TAGS.exams);
  revalidatePath(`/admin/exams/${examId}`);
  return ok(op === "add" ? "Question added." : op === "remove" ? "Question removed." : "Order updated.");
}

// ------------------------------------------------------------------ topics

export async function saveTopic(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: optionalId, slug: text(81), name: text(120).min(1, "Name the topic."), section }).safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  if (d.id) {
    // Slug and section are fixed after creation: imports match topics by slug.
    const t = await db.topic.update({ where: { id: d.id }, data: { name: d.name } }).catch(() => null);
    if (!t) return fail("Topic not found.");
    await audit(admin, "topic.rename", "Topic", t.id, { name: d.name });
  } else {
    const slugIssue = slugProblem(d.slug);
    if (slugIssue) return fail(slugIssue);
    if (await db.topic.findUnique({ where: { slug: d.slug } })) return fail("A topic with that slug already exists.");
    const t = await db.topic.create({ data: { slug: d.slug, name: d.name, section: d.section } });
    await audit(admin, "topic.create", "Topic", t.id, { slug: d.slug });
  }
  revalidatePath("/admin/topics");
  return ok(d.id ? "Topic renamed." : "Topic created.");
}

// ------------------------------------------------------------------ resources

const resourceSchema = z.object({
  id: optionalId,
  title: text(200).min(1, "Give it a title."),
  slug: text(81),
  description: text(500).min(1, "Add a short description."),
  kind: z.enum(["NOTES", "PRACTICE_SET", "GUIDE"]),
  section: z.union([z.literal(""), section]),
  url: text(2000),
  examId: optionalId,
  position: z.coerce.number().int().min(0).max(10_000),
  status: contentStatus,
});

export async function saveResource(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = resourceSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const slugIssue = slugProblem(d.slug);
  if (slugIssue) return fail(slugIssue);
  if (d.url) {
    const urlIssue = httpsUrlProblem(d.url);
    if (urlIssue) return fail(urlIssue);
  }
  if (d.examId && !(await db.exam.findUnique({ where: { id: d.examId }, select: { id: true } }))) return fail("That exam no longer exists.");
  const clash = await db.resource.findUnique({ where: { slug: d.slug }, select: { id: true } });
  if (clash && clash.id !== d.id) return fail("Another resource already uses that slug.");

  const data = {
    title: d.title,
    slug: d.slug,
    description: d.description,
    kind: d.kind,
    section: d.section || null,
    url: d.url || null,
    examId: d.examId,
    position: d.position,
    status: d.status,
  };
  const r = d.id
    ? await db.resource.update({ where: { id: d.id }, data }).catch(() => null)
    : await db.resource.create({ data });
  if (!r) return fail("Resource not found.");
  await audit(admin, d.id ? "resource.update" : "resource.create", "Resource", r.id, { status: d.status });
  updateTag(PUBLIC_TAGS.resources);
  revalidatePath("/admin/resources");
  return ok(d.id ? "Resource saved." : "Resource created.");
}

// ------------------------------------------------------------------ pricing

const planSchema = z.object({
  id,
  name: text(120).min(1),
  priceLabel: text(60).min(1, "Show a price, e.g. $2,000 or Free."),
  detail: text(200),
  features: text(4000),
  note: text(500),
  ctaLabel: text(60).min(1),
  ctaHref: text(500).min(1),
  featured: z.string().optional(),
  position: z.coerce.number().int().min(0).max(100),
  status: contentStatus,
});

export async function savePricingPlan(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = planSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const hrefIssue = ctaHrefProblem(d.ctaHref);
  if (hrefIssue) return fail(hrefIssue);
  const features = parseFeatures(d.features);
  if (features.length > 12 || features.some((f) => f.length > 200)) return fail("Keep it to 12 features of up to 200 characters each.");
  const plan = await db.pricingPlan
    .update({
      where: { id: d.id },
      data: {
        name: d.name,
        priceLabel: d.priceLabel,
        detail: d.detail || null,
        features,
        note: d.note || null,
        ctaLabel: d.ctaLabel,
        ctaHref: d.ctaHref,
        featured: d.featured === "on",
        position: d.position,
        status: d.status,
      },
    })
    .catch(() => null);
  if (!plan) return fail("Plan not found.");
  await audit(admin, "pricing.update", "PricingPlan", plan.id, { slug: plan.slug, priceLabel: d.priceLabel, status: d.status });
  updateTag(PUBLIC_TAGS.pricing);
  revalidatePath("/admin/pricing");
  return ok(`${plan.name} saved.`);
}

// ------------------------------------------------------------------ testimonials

export async function saveTestimonial(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: optionalId,
      authorName: text(120).min(1, "Add the student’s name as they want it shown."),
      authorDetail: text(200),
      quote: text(2000).min(10, "The quote is too short."),
      consent: z.string().optional(),
      position: z.coerce.number().int().min(0).max(1000),
    })
    .safeParse(fields(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const consentConfirmed = d.consent === "on";
  const existing = d.id ? await db.testimonial.findUnique({ where: { id: d.id }, select: { status: true } }) : null;
  if (d.id && !existing) return fail("Testimonial not found.");
  // Without consent a testimonial can't stay live.
  const status = !consentConfirmed && existing?.status === "PUBLISHED" ? "DRAFT" : (existing?.status ?? "DRAFT");
  const data = { authorName: d.authorName, authorDetail: d.authorDetail || null, quote: d.quote, consentConfirmed, position: d.position, status };
  const t = d.id ? await db.testimonial.update({ where: { id: d.id }, data }) : await db.testimonial.create({ data });
  await audit(admin, d.id ? "testimonial.update" : "testimonial.create", "Testimonial", t.id, { consentConfirmed });
  updateTag(PUBLIC_TAGS.testimonials);
  revalidatePath("/admin/testimonials");
  return ok(status !== existing?.status && existing ? "Saved and unpublished: consent isn’t recorded." : "Testimonial saved.");
}

// ------------------------------------------------------------------ import

export type ImportResult = ActionResult & {
  issues?: string[];
  summary?: { exams: number; questions: number; passages: number; topics: number; status?: string };
};

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export async function importContent(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const admin = await requireAdmin();
  const intent = formData.get("intent") === "import" ? "import" : "validate";
  const status = formData.get("status") === "REVIEW" ? "REVIEW" : "DRAFT"; // never PUBLISHED straight from a file

  const upload = file(formData, "file");
  let raw = String(formData.get("json") ?? "");
  if (upload) {
    if (upload.size > MAX_IMPORT_BYTES) return { ok: false, message: "Files must be 2 MB or smaller." };
    raw = await upload.text();
  }
  if (!raw.trim()) return { ok: false, message: "Paste JSON or choose a .json file." };
  if (raw.length > MAX_IMPORT_BYTES) return { ok: false, message: "Content must be 2 MB or smaller." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, message: "That isn’t valid JSON.", issues: [e instanceof Error ? e.message : String(e)] };
  }

  let bank;
  try {
    bank = parseBank(json);
  } catch (e) {
    if (e instanceof ImportValidationError) return { ok: false, message: `${e.issues.length} problem${e.issues.length === 1 ? "" : "s"} found.`, issues: e.issues.slice(0, 100) };
    throw e;
  }
  const questions = bank.exams.flatMap((x) => x.items.flatMap((i) => (i.type === "passage" ? i.questions : [i])));
  const passages = bank.exams.flatMap((x) => x.items.filter((i) => i.type === "passage"));
  const summary = { exams: bank.exams.length, questions: questions.length, passages: passages.length, topics: bank.topics.length };

  // Re-importing would overwrite live content with a draft status; refuse instead of silently unpublishing it.
  const [liveExams, liveQuestions] = await Promise.all([
    db.exam.count({ where: { slug: { in: bank.exams.map((x) => x.slug) }, status: "PUBLISHED" } }),
    db.question.count({ where: { externalId: { in: questions.map((q) => q.id) }, status: "PUBLISHED" } }),
  ]);
  if (liveExams + liveQuestions > 0) {
    return {
      ok: false,
      message: `This file would change ${liveExams} published exam${liveExams === 1 ? "" : "s"} and ${liveQuestions} published question${liveQuestions === 1 ? "" : "s"}. Unpublish them first, or use new ids.`,
      summary,
    };
  }

  if (intent === "validate") return { ok: true, message: "Valid. Nothing has been imported yet.", summary };

  const result = await importBank(db, json, status);
  await audit(admin, "content.import", "Exam", null, { ...result, slugs: bank.exams.map((x) => x.slug) });
  revalidatePath("/admin/content");
  return { ok: true, message: `Imported as ${status.toLowerCase()}.`, summary: { ...summary, status } };
}
