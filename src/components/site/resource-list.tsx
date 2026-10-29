import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getPublishedResources } from "@/lib/public-data";
import { sectionShort, type SectionCode } from "@/lib/site";

export async function ResourceList({ kind }: { kind: "NOTES" | "PRACTICE_SET" | "GUIDE" }) {
  const resources = (await getPublishedResources()).filter((r) => r.kind === kind);
  if (resources.length === 0) return <p className="text-muted-foreground">Nothing here yet. Check back soon.</p>;
  return (
    <ul className="divide-y border-y border-t-navy/80">
      {resources.map((r) => (
        <li key={r.id} className="grid gap-3 py-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-6">
          <span className="text-xl font-semibold tracking-tight text-navy">{r.section ? sectionShort[r.section as SectionCode] : "All"}</span>
          <div>
            <h3 className="text-base font-semibold">{r.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>
          </div>
          <div>
            {r.examSlug ? (
              <Link href={`/practice/${r.examSlug}`} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3.5 py-2 text-sm font-medium hover:border-navy">
                Start practice
              </Link>
            ) : r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3.5 py-2 text-sm font-medium hover:border-navy"
              >
                Open notes <ArrowUpRight className="size-4" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex rounded-lg border border-dashed px-3.5 py-2 text-sm text-muted-foreground">Link coming soon</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
