import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getRecentAttempts, getStudentAnalytics } from "@/lib/analytics/student";
import { pct } from "@/lib/analytics/compute";
import { sectionNames, type SectionCode } from "@/lib/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Your progress", robots: { index: false } };

const sectionLabel = (code: string) => sectionNames[code as SectionCode] ?? code;

function Trend({ points }: { points: Array<{ accuracy: number; at: Date }> }) {
  if (points.length < 2) return null;
  const w = 600;
  const h = 140;
  const pad = 8;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - v * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.accuracy).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Accuracy across your last ${points.length} attempts, from ${pct(points[0].accuracy)} to ${pct(points.at(-1)!.accuracy)}`} className="w-full">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
      ))}
      <path d={path} fill="none" stroke="var(--blue)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.accuracy)} r={3.5} fill="var(--blue)">
          <title>{`${p.at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${pct(p.accuracy)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Bar({ value, tone = "blue" }: { value: number | null; tone?: "blue" | "warn" }) {
  const width = `${Math.round((value ?? 0) * 100)}%`;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className={cn("h-full rounded-full", tone === "warn" ? "bg-danger" : "bg-blue")} style={{ width }} />
    </div>
  );
}

export default async function StudentAnalyticsPage() {
  const user = await requireUser("/dashboard/analytics");
  const [a, attempts] = await Promise.all([getStudentAnalytics(user.id), getRecentAttempts(user.id)]);

  if (!a.hasData) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Your progress</h1>
        <p className="mt-3 text-muted-foreground">Finish a practice set and your accuracy, pacing and weakest topics show up here.</p>
        <Link href="/practice" className={cn(buttonVariants(), "mt-6")}>Start practicing</Link>
      </div>
    );
  }

  const momentumText =
    a.momentum == null
      ? "Complete at least six attempts to see your trend."
      : Math.abs(a.momentum) < 0.02
        ? "Holding steady compared with your previous attempts."
        : a.momentum > 0
          ? `Up ${Math.round(a.momentum * 100)} points compared with your previous three attempts.`
          : `Down ${Math.round(-a.momentum * 100)} points compared with your previous three attempts.`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Your progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Based on {a.overall.answered} submitted answers. Results are percent correct; this site doesn’t estimate an official scaled score.</p>
      </header>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Accuracy</p><p className="mt-1 text-3xl font-semibold tabular-nums">{pct(a.overall.accuracy)}</p><p className="text-xs text-muted-foreground">{a.overall.correct} of {a.overall.answered} correct</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Median time</p><p className="mt-1 text-3xl font-semibold tabular-nums">{a.pacing.medianSec == null ? "—" : `${Math.round(a.pacing.medianSec)}s`}</p><p className="text-xs text-muted-foreground">per question</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Rushed misses</p><p className="mt-1 text-3xl font-semibold tabular-nums">{a.pacing.fastWrong}</p><p className="text-xs text-muted-foreground">wrong in under half your median time</p></div>
      </section>

      {a.trend.length >= 2 && (
        <section aria-labelledby="trend" className="rounded-xl border bg-card p-4">
          <h2 id="trend" className="text-sm font-semibold">Accuracy by attempt</h2>
          <p className="mb-2 text-sm text-muted-foreground">{momentumText}</p>
          <Trend points={a.trend} />
        </section>
      )}

      <section aria-labelledby="sections">
        <h2 id="sections" className="mb-3 text-sm font-semibold">By section</h2>
        <ul className="space-y-3">
          {a.sections.map((s) => (
            <li key={s.section}>
              <div className="mb-1 flex justify-between text-sm"><span>{sectionLabel(s.section)}</span><span className="tabular-nums text-muted-foreground">{pct(s.accuracy)} · {s.answered} answered</span></div>
              <Bar value={s.accuracy} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="weak">
          <h2 id="weak" className="mb-1 text-sm font-semibold">Focus next</h2>
          <p className="mb-3 text-xs text-muted-foreground">Topics with at least 3 answers, weakest first.</p>
          {a.weakest.length === 0 ? <p className="text-sm text-muted-foreground">Answer a few more questions per topic to see this.</p> : (
            <ul className="space-y-3">
              {a.weakest.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1 flex justify-between text-sm"><span>{t.name}</span><span className="tabular-nums text-muted-foreground">{pct(t.accuracy)} of {t.answered}</span></div>
                  <Bar value={t.accuracy} tone="warn" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="strong">
          <h2 id="strong" className="mb-1 text-sm font-semibold">Strengths</h2>
          <p className="mb-3 text-xs text-muted-foreground">Where you’re most reliable.</p>
          {a.strongest.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to show yet.</p> : (
            <ul className="space-y-3">
              {a.strongest.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1 flex justify-between text-sm"><span>{t.name}</span><span className="tabular-nums text-muted-foreground">{pct(t.accuracy)} of {t.answered}</span></div>
                  <Bar value={t.accuracy} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {attempts.length > 0 && (
        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-sm font-semibold">Recent attempts</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {attempts.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>{t.exam.title}<span className="text-muted-foreground"> · {t.mode.toLowerCase()}{t.autoSubmitted ? " · time ran out" : ""}</span></span>
                <span className="tabular-nums">{t.correctCount ?? 0}/{t.totalCount ?? 0}<span className="ml-2 text-xs text-muted-foreground">{t.submittedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
