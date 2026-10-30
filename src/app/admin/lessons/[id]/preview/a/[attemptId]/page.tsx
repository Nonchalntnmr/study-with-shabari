import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/player";
import { requireAdmin } from "@/lib/auth/dal";
import { getViewer } from "@/lib/exam/service";
import { loadLessonAttempt } from "@/lib/lessons/service";
import { PreviewFrame } from "../../frame";

export const instant = false;
export const metadata: Metadata = { title: "Lesson preview" };

export default async function LessonPreviewPlayerPage({ params, searchParams }: PageProps<"/admin/lessons/[id]/preview/a/[attemptId]">) {
  await requireAdmin();
  const [{ id, attemptId }, sp] = await Promise.all([params, searchParams]);
  const a = await loadLessonAttempt(attemptId, await getViewer());
  // Only this admin's preview attempts of this lesson; a student attempt never opens here.
  if (!a || a.mode !== "preview" || a.snapshot.lessonId !== id) notFound();
  const base = `/admin/lessons/${id}/preview/a/${attemptId}`;
  return (
    <PreviewFrame lessonId={id} title={a.snapshot.title}>
      <LessonPlayer attempt={a} base={base} introHref={`/admin/lessons/${id}/preview`} requested={typeof sp.step === "string" ? Number(sp.step) : null} scope="admin" />
    </PreviewFrame>
  );
}
