import Link from "next/link";
import { getInProgressAttempts } from "@/lib/practice/in-progress";

export async function ResumeList({ examSlug, heading = "Pick up where you left off" }: { examSlug?: string; heading?: string }) {
  const attempts = await getInProgressAttempts(examSlug);
  if (attempts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-blue/30 bg-sky p-5">
      <h2 className="text-base font-semibold">{heading}</h2>
      <ul className="mt-3 space-y-2">
        {attempts.map((a) => {
          const { expired } = a;
          return (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{a.exam.title}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {a.mode === "TIMED" ? "timed" : "untimed"} · started{" "}
                  {a.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </span>
              <Link href={expired ? `/exam/${a.id}/results` : `/exam/${a.id}`} className="font-medium text-blue hover:underline">
                {expired ? "Time ran out: see results" : "Resume"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
