import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { percent } from "@/lib/exam/scoring";
import { formatClock } from "@/lib/exam/timing";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Practice history", robots: { index: false } };

export default async function HistoryPage() {
  const user = await requireUser("/dashboard/history");
  const attempts = await loadHistory(user.id);
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Practice history</h1>
      {attempts.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          Nothing yet.{" "}
          <Link href="/practice" className="text-blue hover:underline">
            Take a practice set
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Set</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
                <th className="px-4 py-3 text-right font-medium">Time</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {attempts.map((a) => {
                const done = a.status === "SUBMITTED";
                const expired = !done && a.expired;
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium">{a.exam.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.mode === "TIMED" ? "Timed" : "Untimed"}
                      {a.autoSubmitted ? " · time ran out" : ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{done ? `${a.correctCount}/${a.totalCount} · ${percent(a.correctCount ?? 0, a.totalCount ?? 0)}%` : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{done && a.submittedAt ? formatClock(a.submittedAt.getTime() - a.startedAt.getTime()) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={done || expired ? `/exam/${a.id}/results` : `/exam/${a.id}`} className="font-medium text-blue hover:underline">
                        {done || expired ? "Results" : "Resume"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function loadHistory(userId: string) {
  const rows = await db.attempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 200,
    select: { id: true, status: true, mode: true, startedAt: true, submittedAt: true, deadlineAt: true, autoSubmitted: true, correctCount: true, totalCount: true, exam: { select: { title: true } } },
  });
  const now = Date.now();
  return rows.map((a) => ({ ...a, expired: a.deadlineAt !== null && a.deadlineAt.getTime() < now }));
}
