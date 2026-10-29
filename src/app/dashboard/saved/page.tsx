import type { Metadata } from "next";
import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { toggleSavedResource } from "@/lib/dashboard-actions";
import { db } from "@/lib/db";
import { getPublishedResources } from "@/lib/public-data";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Saved resources", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const [resources, saved] = await Promise.all([
    getPublishedResources(),
    db.savedResource.findMany({ where: { userId: user.id }, select: { resourceId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.resourceId));
  const sorted = [...resources].sort((a, b) => Number(savedIds.has(b.id)) - Number(savedIds.has(a.id)));
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Saved resources</h1>
      <p className="mt-2 text-muted-foreground">Bookmark the notes and practice sets you come back to. Saved ones stay at the top.</p>
      <ul className="mt-6 divide-y rounded-2xl border bg-white">
        {sorted.map((r) => {
          const isSaved = savedIds.has(r.id);
          const href = r.examSlug ? `/practice/${r.examSlug}` : r.url;
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
              {href ? (
                r.examSlug ? (
                  <Link href={href} className="text-sm font-medium text-blue hover:underline">
                    Open
                  </Link>
                ) : (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue hover:underline">
                    Open
                  </a>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Coming soon</span>
              )}
              <form action={toggleSavedResource}>
                <input type="hidden" name="resourceId" value={r.id} />
                <input type="hidden" name="save" value={isSaved ? "0" : "1"} />
                <Button type="submit" size="sm" variant={isSaved ? "secondary" : "outline"} aria-pressed={isSaved}>
                  {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  {isSaved ? "Saved" : "Save"}
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
