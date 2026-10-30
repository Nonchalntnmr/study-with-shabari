import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonIntro } from "@/components/lesson/intro";
import { StartLessonForm } from "@/components/lesson/start-lesson-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isQuestionStep } from "@/lib/lessons/flow";
import { buildSnapshot, containsAi } from "@/lib/lessons/snapshot";
import { PreviewFrame } from "./frame";

// The admin's view of a lesson's current draft, approved or not. The public /lessons/[slug] never
// shows drafts to anyone signed in: it decides before streaming, from cached data, so it can 404.
export const instant = false;
export const metadata: Metadata = { title: "Lesson preview" };

export default async function LessonPreviewPage({ params }: PageProps<"/admin/lessons/[id]/preview">) {
  await requireAdmin();
  const { id } = await params;
  const draft = await buildSnapshot(db, id);
  if (!draft) notFound();
  const lesson = {
    mode: "preview" as const,
    title: draft.title,
    summary: draft.summary,
    objectives: draft.objectives,
    questions: draft.steps.filter(isQuestionStep).length,
    ai: containsAi(draft),
  };
  return (
    <PreviewFrame lessonId={id} title={draft.title}>
      <LessonIntro lesson={lesson} start={<StartLessonForm slug={draft.slug} previewLessonId={id} label="Start the preview" />} />
    </PreviewFrame>
  );
}
