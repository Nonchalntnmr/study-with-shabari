import type { MetadataRoute } from "next";
import { getPublishedExams } from "@/lib/public-data";
import { CANONICAL_HOST } from "@/lib/site";

const ORIGIN = `https://${CANONICAL_HOST}`;
const PAGES = ["", "/mcat", "/admissions", "/research", "/practice", "/resources", "/pricing", "/about", "/testimonials", "/book", "/faq", "/contact", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await getPublishedExams();
  return [
    ...PAGES.map((p) => ({ url: `${ORIGIN}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...exams.map((e) => ({ url: `${ORIGIN}/practice/${e.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
