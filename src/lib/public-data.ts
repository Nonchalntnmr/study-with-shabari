import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Availability } from "@/lib/availability";
import { db } from "@/lib/db";
import { isQuestionStep } from "@/lib/lessons/flow";
import { previewAllowed } from "@/lib/lessons/preview";
import { buildSnapshot, containsAi, type LessonSnapshot } from "@/lib/lessons/snapshot";

// Published content for the public pages. Cached into the static shell and
// refreshed within minutes; admin mutations call `updateTag(PUBLIC_TAGS.x)`
// (Server Actions) or `revalidateTag(PUBLIC_TAGS.x, "max")` to refresh at once.
// Only PUBLISHED rows ever leave this module, except unapproved lessons on a deployment that
// allows previews (see getPublicLesson).

export const PUBLIC_TAGS = {
  pricing: "public:pricing",
  resources: "public:resources",
  exams: "public:exams",
  testimonials: "public:testimonials",
  lessons: "public:lessons",
} as const;

export async function getPublishedPlans() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.pricing);
  return db.pricingPlan.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { position: "asc" },
    select: { slug: true, name: true, priceLabel: true, detail: true, features: true, note: true, ctaLabel: true, ctaHref: true, featured: true },
  });
}

export async function getPublishedResources() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.resources, PUBLIC_TAGS.exams);
  const rows = await db.resource.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ position: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      kind: true,
      section: true,
      url: true,
      exam: { select: { slug: true, status: true } },
    },
  });
  // A practice-set resource is only usable while its exam is published.
  return rows.map(({ exam, ...r }) => ({ ...r, examSlug: exam?.status === "PUBLISHED" ? exam.slug : null }));
}

export async function getPublishedExams() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.exams);
  const exams = await db.exam.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ section: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      description: true,
      section: true,
      timeLimitSec: true,
      isSample: true,
      items: { select: { question: { select: { passageId: true } } } },
    },
  });
  return exams.map(({ items, ...e }) => ({
    ...e,
    questionCount: items.length,
    passageCount: new Set(items.map((i) => i.question.passageId).filter(Boolean)).size,
  }));
}

export async function getPublishedExam(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.exams);
  return (await getPublishedExams()).find((e) => e.slug === slug) ?? null;
}

export async function getPublishedTestimonials() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.testimonials);
  return db.testimonial.findMany({
    // Consent is enforced again here, not only at publish time.
    where: { status: "PUBLISHED", consentConfirmed: true },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: { id: true, authorName: true, authorDetail: true, quote: true },
  });
}

export type PublicExam = Awaited<ReturnType<typeof getPublishedExams>>[number];
export type PublicResource = Awaited<ReturnType<typeof getPublishedResources>>[number];
export type PublicPlan = Awaited<ReturnType<typeof getPublishedPlans>>[number];

/**
 * A lesson as the public pages may show it, decided from cached data only (never the visitor's
 * session), so `/lessons/[slug]` can answer a real 404 before anything streams. Students only ever
 * get an approved version; an unapproved draft appears only where previews are allowed by the
 * deployment (local development and LESSON_PREVIEW=on), flagged as a draft. Admins preview drafts
 * at /admin/lessons/[id]/preview instead. Approving calls `updateTag(PUBLIC_TAGS.lessons)`.
 * Returns the intro fields only: nothing here carries an answer.
 */
export async function getPublicLesson(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAGS.lessons);
  const lesson = await db.lesson.findUnique({ where: { slug }, select: { id: true, status: true, publishedVersion: { select: { snapshot: true } } } });
  if (!lesson) return null;
  let snapshot: LessonSnapshot | null = null;
  let mode: "published" | "preview" = "published";
  if (lesson.publishedVersion && lesson.status !== "ARCHIVED") {
    snapshot = lesson.publishedVersion.snapshot as unknown as LessonSnapshot;
  } else if (lesson.status !== "ARCHIVED" && previewAllowed(false)) {
    snapshot = await buildSnapshot(db, lesson.id);
    mode = "preview";
  }
  if (!snapshot) return null;
  return {
    slug,
    mode,
    title: snapshot.title,
    summary: snapshot.summary,
    objectives: snapshot.objectives,
    questions: snapshot.steps.filter(isQuestionStep).length,
    ai: containsAi(snapshot),
  };
}

/** The lesson the homepage invites visitors into, on the same rules as its own page. */
export async function getFeaturedLesson(slug = "dopamine") {
  const lesson = await getPublicLesson(slug);
  if (!lesson) return null;
  return { slug: lesson.slug, title: lesson.title, summary: lesson.summary, questions: lesson.questions, draft: lesson.mode === "preview" };
}

/** What a visitor can open right now, for the links that would otherwise promise it (src/lib/availability.ts). */
export async function getAvailability(): Promise<Availability> {
  const [exams, lesson, resources] = await Promise.all([getPublishedExams(), getFeaturedLesson(), getPublishedResources()]);
  return { practice: exams.length > 0, lesson: lesson !== null, notes: resources.some((r) => r.kind === "NOTES" && r.url) };
}
