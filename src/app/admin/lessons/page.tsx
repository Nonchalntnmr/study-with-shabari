import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { buildSnapshot, containsAi, diffSnapshots, type LessonSnapshot } from "@/lib/lessons/snapshot";
import { Empty, PageHeader, StatusBadge, formatDate } from "../_components/ui";

// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function LessonsPage() {
  await requireAdmin();
  const lessons = await db.lesson.findMany({ orderBy: { title: "asc" }, include: { publishedVersion: { select: { version: true, approvedAt: true, snapshot: true } } } });
  const rows = await Promise.all(
    lessons.map(async (l) => {
      const draft = await buildSnapshot(db, l.id);
      const published = (l.publishedVersion?.snapshot as unknown as LessonSnapshot | undefined) ?? null;
      return { l, ai: draft ? containsAi(draft) : false, changes: draft ? diffSnapshots(published, draft).length : 0 };
    }),
  );
  const queue = rows.filter((r) => r.l.status === "REVIEW");

  return (
    <>
      <PageHeader
        title="Lessons"
        description="Students only see an approved version. Edits change the draft, and a lesson waits here for review until an admin approves it again."
      />
      <p className="mb-4 text-sm">
        <span className="font-medium">Review queue:</span> {queue.length === 0 ? "nothing waiting." : `${queue.length} lesson${queue.length === 1 ? "" : "s"} waiting for approval.`}
      </p>
      {rows.length === 0 ? (
        <Empty>No lessons yet. Import one with scripts/import-lesson.ts.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lesson</TableHead>
                <TableHead>Draft</TableHead>
                <TableHead>Students see</TableHead>
                <TableHead>Unapproved changes</TableHead>
                <TableHead>Authored</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ l, ai, changes }) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/admin/lessons/${l.id}`} className="font-medium text-navy underline-offset-4 hover:underline">
                      {l.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">/lessons/{l.slug}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-sm">{l.publishedVersion ? `Version ${l.publishedVersion.version}, approved ${formatDate(l.publishedVersion.approvedAt)}` : "Nothing (hidden)"}</TableCell>
                  <TableCell className="text-sm tabular-nums">{l.publishedVersion ? changes : "All (never approved)"}</TableCell>
                  <TableCell className="text-sm">{ai ? "Includes AI drafts" : "Human"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
