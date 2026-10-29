import { requireAdmin } from "@/lib/auth/dal";
import Link from "next/link";
import { getDailyActivity, getPlatformMetrics } from "@/lib/analytics/admin";
import { pct } from "@/lib/analytics/compute";
import { PageHeader, Stat } from "./_components/ui";

export default async function AdminOverview() {
  // Layouts don't re-run on client navigation, so every page checks for itself.
  await requireAdmin();
  const [m, activity] = await Promise.all([getPlatformMetrics(), getDailyActivity(14)]);
  const peak = Math.max(1, ...activity.map((a) => a.attempts));
  const attention: Array<{ href: string; text: string }> = [];
  if (m.inquiries.NEW > 0) attention.push({ href: "/admin/inquiries?status=NEW", text: `${m.inquiries.NEW} new inquir${m.inquiries.NEW === 1 ? "y" : "ies"} waiting for a reply` });
  if (m.email.failed > 0) attention.push({ href: "/admin/audit", text: `${m.email.failed} email${m.email.failed === 1 ? "" : "s"} failed to send` });
  if (m.email.notConfigured > 0) attention.push({ href: "/admin/audit", text: `${m.email.notConfigured} email${m.email.notConfigured === 1 ? " is" : "s are"} stored but not sent because no email transport is verified yet` });
  if (m.content.draftQuestions > 0) attention.push({ href: "/admin/content?tab=questions&status=DRAFT", text: `${m.content.draftQuestions} question${m.content.draftQuestions === 1 ? "" : "s"} in draft or review` });

  return (
    <>
      <PageHeader title="Overview" description="How the platform is being used and what needs your attention." />

      {attention.length > 0 && (
        <section aria-labelledby="attention" className="mb-6 rounded-xl border bg-warning-soft p-4">
          <h2 id="attention" className="text-sm font-semibold">Needs attention</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {attention.map((a) => (
              <li key={a.text}>
                <Link href={a.href} className="underline-offset-4 hover:underline">{a.text}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={m.users - m.admins} hint={`${m.newUsers7} new in 7 days`} />
        <Stat label="Active, 30 days" value={m.activeUsers30} hint="signed-in students who practiced" />
        <Stat label="Attempts" value={m.attempts} hint={`${m.attempts7} in 7 days · ${m.guestAttempts} as guests`} />
        <Stat label="Completion" value={pct(m.completionRate)} hint={`${m.autoSubmitted} auto-submitted at the deadline`} />
        <Stat label="New inquiries" value={m.inquiries.NEW} tone={m.inquiries.NEW > 0 ? "warn" : undefined} hint={`${m.inquiries.IN_PROGRESS} in progress`} />
        <Stat label="Published questions" value={m.content.publishedQuestions} hint={`${m.content.draftQuestions} in draft or review`} />
        <Stat label="Published exams" value={m.content.publishedExams} />
        <Stat label="Admins" value={m.admins} />
      </div>

      <section aria-labelledby="activity" className="mt-8">
        <h2 id="activity" className="mb-3 text-sm font-semibold">Attempts started, last 14 days</h2>
        <div className="flex h-32 items-end gap-1.5 rounded-xl border bg-card p-4" role="img" aria-label={`Daily attempts started, peak ${peak}`}>
          {activity.map((a) => (
            <div key={a.day} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${a.day}: ${a.attempts}`}>
              <div className="w-full rounded-t bg-blue" style={{ height: `${Math.max(a.attempts > 0 ? 6 : 2, (a.attempts / peak) * 100)}%`, opacity: a.attempts === 0 ? 0.25 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{activity[0]?.day}</span>
          <span>{activity.at(-1)?.day}</span>
        </div>
      </section>
    </>
  );
}
