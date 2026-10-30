import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LessonResult } from "@/components/lesson/result";
import { getViewer } from "@/lib/exam/service";
import { loadLessonAttempt } from "@/lib/lessons/service";

// The lesson itself was checked in ../../layout.tsx, before this streams.
export const instant = false;
export const metadata: Metadata = { title: "Lesson results", robots: { index: false, follow: false } };
export const unstable_paramMatching = { attemptId: "dynamic" } as const;

export default function LessonResultPage({ params }: PageProps<"/lessons/[slug]/a/[attemptId]/result">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-5 py-24 text-quiet">Putting your results together…</p>}>
      {params.then(({ slug, attemptId }) => (
        <Result slug={slug} attemptId={attemptId} />
      ))}
    </Suspense>
  );
}

async function Result({ slug, attemptId }: { slug: string; attemptId: string }) {
  // Public URLs never use the admin role; admins preview drafts under /admin/lessons.
  const a = await loadLessonAttempt(attemptId, { ...(await getViewer()), isAdmin: false });
  if (!a || a.snapshot.slug !== slug) notFound();
  return <LessonResult attempt={a} base={`/lessons/${slug}/a/${attemptId}`} />;
}
