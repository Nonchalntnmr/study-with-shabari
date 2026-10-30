import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ClearAttemptBackup } from "@/components/exam/clear-backup";
import { ResultsQuestions } from "@/components/exam/results-view";
import { RetestForm } from "@/components/exam/retest-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getResults, getViewer } from "@/lib/exam/service";
import { percent } from "@/lib/exam/scoring";
import { formatClock } from "@/lib/exam/timing";
import { AAMC_DISCLAIMER } from "@/lib/site";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Results", robots: { index: false, follow: false } };

export default function ResultsPage({ params }: PageProps<"/exam/[attemptId]/results">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<p className="mx-auto max-w-4xl px-6 py-16 text-muted-foreground">Scoring your practice set…</p>}>
          {params.then(({ attemptId }) => (
            <Results attemptId={attemptId} />
          ))}
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Results({ attemptId }: { attemptId: string }) {
  const [out, user] = await Promise.all([getViewer().then((v) => getResults(attemptId, v)), getCurrentUser()]);
  if (out.kind === "not_found") notFound();
  if (out.kind === "in_progress") redirect(`/exam/${attemptId}`);
  const r = out.results;
  const pct = percent(r.correct, r.total);

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6">
      <section className="rounded-3xl border bg-white p-7 sm:p-9">
        <p className="text-sm text-muted-foreground">
          {r.exam.title} · {r.mode === "TIMED" ? "timed" : "untimed"}
          {r.autoSubmitted && " · submitted automatically when time ran out"}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-6xl font-semibold tracking-[-0.04em] text-navy tabular-nums" data-testid="score">
              {r.correct}/{r.total}
            </p>
            <p className="mt-1 text-muted-foreground">{pct}% correct</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Answered</dt>
            <dd className="font-medium tabular-nums">
              {r.answered} of {r.total}
            </dd>
            <dt className="text-muted-foreground">Time used</dt>
            <dd className="font-medium tabular-nums">{formatClock(r.timeUsedMs)}</dd>
            <dt className="text-muted-foreground">Avg per question</dt>
            <dd className="font-medium tabular-nums">{formatClock(r.total ? r.timeUsedMs / r.total : 0)}</dd>
          </dl>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          This is percent correct on original practice questions, not an MCAT scaled score.
        </p>
        {r.retestOf && (
          <p className="mt-4 text-sm" data-testid="retest-of">
            Retest of an earlier attempt, which had {r.retestOf.correctCount ?? 0} of {r.retestOf.totalCount ?? 0} right.{" "}
            <Link href={`/exam/${r.retestOf.id}/results`} className="text-blue hover:underline">
              See the original
            </Link>
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <Button asChild className="h-10 px-4">
            <Link href="/practice">More practice</Link>
          </Button>
          {out.isOwner && r.correct < r.total && <RetestForm attemptId={r.attemptId} missed={r.total - r.correct} />}
          {user ? (
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/dashboard/analytics">See your progress</Link>
            </Button>
          ) : out.isOwner ? (
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/signup?next=/dashboard">Save results to a free account</Link>
            </Button>
          ) : null}
        </div>
      </section>

      {r.topics.length > 0 && (
        <section aria-labelledby="topics-h">
          <h2 id="topics-h" className="mb-4 text-2xl font-semibold">
            By topic
          </h2>
          <ul className="space-y-3">
            {r.topics.map((t) => (
              <li key={t.slug}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.correct}/{t.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className={t.accuracy < 0.6 ? "h-full rounded-full bg-danger" : "h-full rounded-full bg-blue"} style={{ width: `${Math.round(t.accuracy * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.retests.length > 0 && (
        <section aria-labelledby="retests-h">
          <h2 id="retests-h" className="mb-3 text-2xl font-semibold">
            Retests of this set
          </h2>
          <ul className="divide-y rounded-2xl border bg-white text-sm" data-testid="retest-history">
            {r.retests.map((x) => (
              <li key={x.id} className="flex items-center justify-between px-5 py-3">
                <span>
                  {x.correctCount ?? 0} of {x.totalCount ?? 0} right
                </span>
                <Link href={`/exam/${x.id}/results`} className="text-blue hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ResultsQuestions results={r} />
      {out.isOwner && <ClearAttemptBackup attemptId={r.attemptId} />}
      <p className="text-xs text-muted-foreground">{AAMC_DISCLAIMER}</p>
    </div>
  );
}
