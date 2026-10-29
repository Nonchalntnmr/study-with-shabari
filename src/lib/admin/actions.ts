"use server";

import { revalidatePath, updateTag } from "next/cache";
import { PUBLIC_TAGS } from "@/lib/public-data";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { audit } from "@/lib/security/audit";
import { pinVersionsWithRetry } from "@/lib/exam/versions";
import {
  approvalProblem,
  examPublishProblems,
  questionPublishProblems,
  roleChangeProblem,
  testimonialPublishProblems,
} from "./rules";

// Every export here is a public POST endpoint. Each one re-checks the caller is
// an admin, validates its input, writes an audit entry, and never trusts the UI.

export type ActionResult = { ok: boolean; message: string };

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

const id = z.string().min(1).max(64);
const contentStatus = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);
const inquiryStatus = z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]);

function parse<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: ActionResult } {
  const result = schema.safeParse(data);
  return result.success ? { data: result.data } : { error: fail("That request wasn't valid.") };
}

// ------------------------------------------------------------------ inquiries

export async function setInquiryStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: inquiryStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const existing = await db.inquiry.findUnique({ where: { id: p.data.id }, select: { status: true } });
  if (!existing) return fail("Inquiry not found.");
  await db.inquiry.update({ where: { id: p.data.id }, data: { status: p.data.status } });
  await audit(admin, "inquiry.status", "Inquiry", p.data.id, { from: existing.status, to: p.data.status });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return ok("Status updated.");
}

export async function saveInquiryNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, note: z.string().max(2000) }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const note = p.data.note.trim();
  await db.inquiry.update({ where: { id: p.data.id }, data: { adminNote: note === "" ? null : note } });
  await audit(admin, "inquiry.note", "Inquiry", p.data.id);
  revalidatePath("/admin/inquiries");
  return ok("Note saved.");
}

/** Erases a contact message on request, with the automatic-email records that hold the sender's address. */
export async function deleteInquiry(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, confirm: z.literal("on") }), Object.fromEntries(formData));
  if ("error" in p) return fail("Tick the box to confirm the deletion.");
  const existing = await db.inquiry.findUnique({ where: { id: p.data.id }, select: { kind: true } });
  if (!existing) return fail("Inquiry not found.");
  await db.$transaction([db.emailMessage.deleteMany({ where: { inquiryId: p.data.id } }), db.inquiry.delete({ where: { id: p.data.id } })]);
  // No name, email or message in the log: the point is that they're gone.
  await audit(admin, "inquiry.delete", "Inquiry", p.data.id, { kind: existing.kind });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return ok("Deleted.");
}

// -------------------------------------------------------------------- content

/** Pins the question's current content as a version attributed to this admin; returns its number. */
async function recordVersion(questionId: string, adminId: string): Promise<number> {
  const [versionId] = await pinVersionsWithRetry(db, [questionId], { createdById: adminId, reviewedById: adminId });
  return (await db.questionVersion.findUniqueOrThrow({ where: { id: versionId }, select: { version: true } })).version;
}

/** The human review an AI-drafted question needs before it can publish. */
export async function approveQuestion(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, attest: z.literal("on") }), Object.fromEntries(formData));
  if ("error" in p) return fail("Tick the box to confirm you've checked the question, every answer and every rationale.");
  const q = await db.question.findUnique({ where: { id: p.data.id }, select: { authoredBy: true, reviewedById: true } });
  if (!q) return fail("Question not found.");
  const denied = approvalProblem({ approverRole: admin.role, authoredBy: q.authoredBy, attestedReview: true });
  if (denied) return fail(denied);
  await db.question.update({ where: { id: p.data.id }, data: { reviewedById: admin.id, reviewedAt: new Date() } });
  await audit(admin, "question.approve", "Question", p.data.id, { authoredBy: q.authoredBy });
  revalidatePath(`/admin/questions/${p.data.id}`);
  return ok("Approved. It can be published now.");
}

export async function setQuestionStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: contentStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const q = await db.question.findUnique({
    where: { id: p.data.id },
    select: {
      stem: true,
      explanation: true,
      status: true,
      authoredBy: true,
      reviewedById: true,
      passage: { select: { status: true } },
      choices: { select: { label: true, text: true, isCorrect: true, rationale: true } },
      _count: { select: { topics: true } },
    },
  });
  if (!q) return fail("Question not found.");
  if (p.data.status === "PUBLISHED") {
    const problems = questionPublishProblems({ ...q, topicCount: q._count.topics });
    if (q.passage && q.passage.status !== "PUBLISHED") problems.push("Publish its passage first.");
    if (problems.length > 0) return fail(problems.join(" "));
  } else {
    // Attempts include every question in an exam, so a published exam must not hold unpublished ones.
    const live = await db.exam.findMany({
      where: { status: "PUBLISHED", items: { some: { questionId: p.data.id } } },
      select: { title: true },
    });
    if (live.length > 0) return fail(`Unpublish ${live.map((e) => `“${e.title}”`).join(", ")} first; it still uses this question.`);
  }
  await db.question.update({ where: { id: p.data.id }, data: { status: p.data.status } });
  // Publishing is an approval: freeze this content as a version attributed to the admin.
  const version = p.data.status === "PUBLISHED" ? await recordVersion(p.data.id, admin.id) : null;
  await audit(admin, "question.status", "Question", p.data.id, { from: q.status, to: p.data.status, ...(version ? { version } : {}) });
  revalidatePath("/admin/content");
  return ok(`Question set to ${p.data.status.toLowerCase()}.`);
}

export async function setPassageStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: contentStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const passage = await db.passage.findUnique({ where: { id: p.data.id }, select: { body: true, status: true } });
  if (!passage) return fail("Passage not found.");
  if (p.data.status === "PUBLISHED" && passage.body.trim().length < 50) return fail("The passage text is too short to publish.");
  if (p.data.status !== "PUBLISHED") {
    const live = await db.question.count({ where: { passageId: p.data.id, status: "PUBLISHED" } });
    if (live > 0) return fail(`Unpublish its ${live} published question${live === 1 ? "" : "s"} first.`);
  }
  await db.passage.update({ where: { id: p.data.id }, data: { status: p.data.status } });
  await audit(admin, "passage.status", "Passage", p.data.id, { from: passage.status, to: p.data.status });
  revalidatePath("/admin/content");
  return ok(`Passage set to ${p.data.status.toLowerCase()}.`);
}

export async function setExamStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: contentStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const exam = await db.exam.findUnique({
    where: { id: p.data.id },
    select: { status: true, publishedAt: true, items: { select: { position: true, question: { select: { status: true } } } } },
  });
  if (!exam) return fail("Exam not found.");
  if (p.data.status === "PUBLISHED") {
    const problems = examPublishProblems({
      items: exam.items.map((i) => ({ position: i.position, questionStatus: i.question.status })),
    });
    if (problems.length > 0) return fail(problems.join(" "));
  }
  await db.exam.update({
    where: { id: p.data.id },
    data: {
      status: p.data.status,
      publishedAt: p.data.status === "PUBLISHED" ? (exam.publishedAt ?? new Date()) : exam.publishedAt,
    },
  });
  await audit(admin, "exam.status", "Exam", p.data.id, { from: exam.status, to: p.data.status });
  updateTag(PUBLIC_TAGS.exams);
  revalidatePath("/admin/content");
  return ok(`Exam set to ${p.data.status.toLowerCase()}.`);
}

export async function setResourceStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: contentStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const r = await db.resource.findUnique({ where: { id: p.data.id }, select: { status: true } });
  if (!r) return fail("Resource not found.");
  await db.resource.update({ where: { id: p.data.id }, data: { status: p.data.status } });
  await audit(admin, "resource.status", "Resource", p.data.id, { from: r.status, to: p.data.status });
  updateTag(PUBLIC_TAGS.resources);
  revalidatePath("/admin/content");
  return ok(`Resource set to ${p.data.status.toLowerCase()}.`);
}

export async function setTestimonialConsent(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, consent: z.enum(["true", "false"]) }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const consentConfirmed = p.data.consent === "true";
  const t = await db.testimonial.findUnique({ where: { id: p.data.id }, select: { status: true } });
  if (!t) return fail("Testimonial not found.");
  // Withdrawing consent takes the testimonial down immediately.
  await db.testimonial.update({
    where: { id: p.data.id },
    data: { consentConfirmed, status: !consentConfirmed && t.status === "PUBLISHED" ? "DRAFT" : t.status },
  });
  await audit(admin, "testimonial.consent", "Testimonial", p.data.id, { consentConfirmed });
  updateTag(PUBLIC_TAGS.testimonials);
  revalidatePath("/admin/content");
  return ok(consentConfirmed ? "Consent recorded." : "Consent withdrawn and testimonial unpublished.");
}

export async function setTestimonialStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, status: contentStatus }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const t = await db.testimonial.findUnique({ where: { id: p.data.id }, select: { status: true, quote: true, consentConfirmed: true } });
  if (!t) return fail("Testimonial not found.");
  if (p.data.status === "PUBLISHED") {
    const problems = testimonialPublishProblems(t);
    if (problems.length > 0) return fail(problems.join(" "));
  }
  await db.testimonial.update({ where: { id: p.data.id }, data: { status: p.data.status } });
  await audit(admin, "testimonial.status", "Testimonial", p.data.id, { from: t.status, to: p.data.status });
  updateTag(PUBLIC_TAGS.testimonials);
  revalidatePath("/admin/content");
  return ok(`Testimonial set to ${p.data.status.toLowerCase()}.`);
}

// ---------------------------------------------------------------------- users

export async function setUserRole(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id, role: z.enum(["STUDENT", "ADMIN"]) }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const target = await db.user.findUnique({ where: { id: p.data.id }, select: { role: true, email: true } });
  if (!target) return fail("User not found.");
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  const problem = roleChangeProblem({
    actorId: admin.id,
    targetId: p.data.id,
    targetRole: target.role,
    newRole: p.data.role,
    adminCount,
  });
  if (problem) return fail(problem);
  await db.user.update({ where: { id: p.data.id }, data: { role: p.data.role } });
  // A role change should not leave old sessions with stale authority.
  if (p.data.id !== admin.id) await db.session.deleteMany({ where: { userId: p.data.id } });
  await audit(admin, "user.role", "User", p.data.id, { from: target.role, to: p.data.role });
  revalidatePath("/admin/users");
  return ok(`${target.email} is now ${p.data.role.toLowerCase()}.`);
}

export async function revokeUserSessions(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = parse(z.object({ id }), Object.fromEntries(formData));
  if ("error" in p) return p.error;
  const { count } = await db.session.deleteMany({ where: { userId: p.data.id } });
  await audit(admin, "user.sessions_revoked", "User", p.data.id, { count });
  revalidatePath("/admin/users");
  return ok(count === 0 ? "No active sessions." : `Signed out ${count} session${count === 1 ? "" : "s"}.`);
}
