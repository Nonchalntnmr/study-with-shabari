import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonResult } from "@/components/lesson/result";
import { requireAdmin } from "@/lib/auth/dal";
import { getViewer } from "@/lib/exam/service";
import { loadLessonAttempt } from "@/lib/lessons/service";
import { PreviewFrame } from "../../../frame";

export const instant = false;
export const metadata: Metadata = { title: "Lesson preview results" };

export default async function LessonPreviewResultPage({ params }: PageProps<"/admin/lessons/[id]/preview/a/[attemptId]/result">) {
  await requireAdmin();
  const { id, attemptId } = await params;
  const a = await loadLessonAttempt(attemptId, await getViewer());
  if (!a || a.mode !== "preview" || a.snapshot.lessonId !== id) notFound();
  return (
    <PreviewFrame lessonId={id} title={a.snapshot.title}>
      <LessonResult attempt={a} base={`/admin/lessons/${id}/preview/a/${attemptId}`} />
    </PreviewFrame>
  );
}
