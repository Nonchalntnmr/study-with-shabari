import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResumeList } from "@/components/site/resume-list";
import { Button } from "@/components/ui/button";
import { pct } from "@/lib/analytics/compute";
import { requireUser } from "@/lib/auth/dal";
import { getStudyPlan } from "@/lib/dashboard";
import { contactEmail } from "@/lib/site";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardHome() {
  const user = await requireUser("/dashboard");
  const { plan, analytics } = await getStudyPlan(user.id);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
        <p className="mt-1 text-muted-foreground">{plan.phaseText}</p>
      </header>

      <Suspense fallback={null}>
        <ResumeList />
      </Suspense>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Accuracy</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-navy">{pct(analytics.overall.accuracy)}</p>
          <p className="text-xs text-muted-foreground">{analytics.overall.answered} questions scored</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sets completed</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-navy">{analytics.trend.length}</p>
          <p className="text-xs text-muted-foreground">submitted attempts</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Test date</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-navy">{plan.weeksLeft === null ? "—" : `${plan.weeksLeft} wk`}</p>
          <p className="text-xs text-muted-foreground">
            {plan.weeksLeft === null ? (
              <Link href="/dashboard/account" className="text-blue hover:underline">
                Add your test date
              </Link>
            ) : (
              "until your test"
            )}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Do this next</h2>
          <Link href="/dashboard/plan" className="text-sm font-medium text-blue hover:underline">
            Full study plan →
          </Link>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {plan.tasks.slice(0, 4).map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue" />
              {t}
            </li>
          ))}
        </ul>
        {plan.nextSets[0] && (
          <Button asChild className="mt-5 h-10 px-4">
            <Link href={`/practice/${plan.nextSets[0].slug}`}>Start “{plan.nextSets[0].title}”</Link>
          </Button>
        )}
      </section>

      <section className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-ink">Tutoring sessions</h2>
        <p className="mt-1">
          Sessions are scheduled through Calendly, and your confirmation and Zoom link arrive by email. Questions about a session? Email{" "}
          <a href={`mailto:${contactEmail}`} className="text-blue hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
