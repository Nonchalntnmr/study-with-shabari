import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonIntro } from "@/components/lesson/intro";
import { StartLessonForm } from "@/components/lesson/start-lesson-form";
import { getPublicLesson } from "@/lib/public-data";

// Whether a lesson is shown is decided from cached data only (approved, or a deployment that allows
// previews), never the visitor's session, and before anything streams, so an unknown slug or an
// unapproved draft answers a real 404. Admins preview drafts at /admin/lessons/[id]/preview.
//
// "blocking": a slug that hasn't been rendered yet renders in full before the response starts, then
// is cached like any static page. Otherwise the server may stream the route's shared shell first
// (`next start` does, on a slug's first visit), which commits a 200 before notFound() can run. The
// e2e spec lesson-visibility.spec.ts checks the status on first visits. `instant = false` is what
// lets this route block instead of serving that shell.
export const unstable_paramMatching = { slug: "blocking" } as const;
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const lesson = await getPublicLesson((await params).slug);
  if (!lesson) return { title: "Lesson not found" };
  return { title: lesson.title, description: lesson.summary, alternates: { canonical: `/lessons/${lesson.slug}` } };
}

export default async function LessonIntroPage({ params }: PageProps<"/lessons/[slug]">) {
  const lesson = await getPublicLesson((await params).slug);
  if (!lesson) notFound();
  return <LessonIntro lesson={lesson} start={<StartLessonForm slug={lesson.slug} />} />;
}
