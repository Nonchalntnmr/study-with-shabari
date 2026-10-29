import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ExamRunner } from "@/components/exam/exam-runner";
import { getViewer, loadRunnerState } from "@/lib/exam/service";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Practice in progress", robots: { index: false, follow: false } };

export default function ExamPage({ params }: PageProps<"/exam/[attemptId]">) {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-sm text-muted-foreground">Loading your practice set…</div>}>
      {params.then(({ attemptId }) => (
        <Runner attemptId={attemptId} />
      ))}
    </Suspense>
  );
}

async function Runner({ attemptId }: { attemptId: string }) {
  const result = await loadRunnerState(attemptId, await getViewer());
  if (result.kind === "not_found") notFound();
  if (result.kind === "submitted") redirect(`/exam/${attemptId}/results`);
  return <ExamRunner initial={result.state} />;
}
