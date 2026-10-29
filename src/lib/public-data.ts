import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

// Published content for the public pages. Cached into the static shell and
// refreshed within minutes; admin mutations call `updateTag(PUBLIC_TAGS.x)`
// (Server Actions) or `revalidateTag(PUBLIC_TAGS.x, "max")` to refresh at once.
// Only PUBLISHED rows ever leave this module.

export const PUBLIC_TAGS = {
  pricing: "public:pricing",
  resources: "public:resources",
  exams: "public:exams",
  testimonials: "public:testimonials",
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
      id: true,
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
