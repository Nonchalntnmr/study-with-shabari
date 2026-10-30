import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LessonPlayer } from "@/components/lesson/player";
import { getViewer } from "@/lib/exam/service";
import { loadLessonAttempt } from "@/lib/lessons/service";

// A student's own attempt, read fresh per request. The lesson itself was checked in ../layout.tsx.
export const instant = false;
export const metadata: Metadata = { title: "Lesson in progress", robots: { index: false, follow: false } };
// The attempt id is never prerendered: one shell per lesson serves every attempt.
export const unstable_paramMatching = { attemptId: "dynamic" } as const;

export default function LessonPlayerPage({ params, searchParams }: PageProps<"/lessons/[slug]/a/[attemptId]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-5 py-24 text-quiet">Loading your lesson…</p>}>
      {Promise.all([params, searchParams]).then(([{ slug, attemptId }, sp]) => (
        <Player slug={slug} attemptId={attemptId} step={typeof sp.step === "string" ? Number(sp.step) : null} />
      ))}
    </Suspense>
  );
}

async function Player({ slug, attemptId, step }: { slug: string; attemptId: string; step: number | null }) {
  // Public URLs never use the admin role; admins preview drafts under /admin/lessons.
  const a = await loadLessonAttempt(attemptId, { ...(await getViewer()), isAdmin: false });
  if (!a || a.snapshot.slug !== slug) notFound();
  return <LessonPlayer attempt={a} base={`/lessons/${slug}/a/${attemptId}`} introHref={`/lessons/${slug}`} requested={step} />;
}
