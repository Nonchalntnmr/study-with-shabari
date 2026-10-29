import type { Metadata } from "next";
import Link from "next/link";
import { pct } from "@/lib/analytics/compute";
import { requireUser } from "@/lib/auth/dal";
import { getStudyPlan } from "@/lib/dashboard";
import { sectionNames, type SectionCode } from "@/lib/site";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Study plan", robots: { index: false } };

export default async function PlanPage() {
  const user = await requireUser("/dashboard/plan");
  const { plan, testDate, analytics } = await getStudyPlan(user.id);
  const sectionStat = new Map(analytics.sections.map((s) => [s.section, s]));
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Your study plan</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Built from your submitted practice{testDate ? ` and your test date (${testDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })})` : ""}. It updates every
          time you finish a set.{" "}
          {!testDate && (
            <Link href="/dashboard/account" className="text-blue hover:underline">
              Add your test date
            </Link>
          )}
        </p>
      </header>

      <section className="rounded-2xl border bg-sky p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">
          {plan.weeksLeft === null ? "No test date yet" : plan.phase === "past" ? "Test date passed" : `${plan.weeksLeft} weeks to go`}
        </p>
        <p className="mt-2 text-lg text-navy">{plan.phaseText}</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">This week</h2>
        <ol className="space-y-2">
          {plan.tasks.map((t, i) => (
            <li key={t} className="flex gap-3 rounded-xl border bg-white px-4 py-3 text-sm">
              <span className="font-semibold tabular-nums text-blue">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Focus order</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {plan.focusSections.map((s, i) => {
            const st = sectionStat.get(s);
            return (
              <li key={s} className="rounded-2xl border bg-white p-5">
                <p className="text-xs text-muted-foreground">#{i + 1}</p>
                <p className="mt-1 font-medium">{sectionNames[s as SectionCode]}</p>
                <p className="mt-2 text-sm text-muted-foreground">{st ? `${pct(st.accuracy)} on ${st.answered} questions` : "Not practiced yet"}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {plan.nextSets.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recommended practice</h2>
          <ul className="space-y-2">
            {plan.nextSets.map((e) => (
              <li key={e.slug} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm">
                <span>
                  {e.title}
                  {e.attempted && e.bestAccuracy !== null && <span className="text-muted-foreground"> · best so far {pct(e.bestAccuracy)}</span>}
                </span>
                <Link href={`/practice/${e.slug}`} className="font-medium text-blue hover:underline">
                  {e.attempted ? "Retake" : "Start"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        These suggestions come from simple rules applied to your own results: weakest sections and topics first, sets you haven’t tried before
        retakes. They’re a starting point, not a prescription. Bring them to a tutoring call if you want a second opinion.
      </p>
    </div>
  );
}
