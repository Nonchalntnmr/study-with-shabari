import { requireAdmin } from "@/lib/auth/dal";
import { getQuestionQuality } from "@/lib/analytics/admin";
import { pct } from "@/lib/analytics/compute";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, StatusBadge } from "../_components/ui";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export default async function QualityPage() {
  // Layouts don't re-run on client navigation, so every page checks for itself.
  await requireAdmin();
  const items = await getQuestionQuality(10, 20);
  return (
    <>
      <PageHeader
        title="Question quality"
        description="The questions students miss most, once at least 10 have answered. A high miss rate is a prompt to re-read the item, not proof it is wrong: it may just be hard."
      />
      {items.length === 0 ? (
        <Empty>Not enough responses yet. Items appear here once 10 submitted answers exist.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Answers</TableHead>
                <TableHead className="text-right">Correct</TableHead>
                <TableHead className="text-right">Avg time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.questionId}>
                  <TableCell className="max-w-md text-sm">{i.stem.length > 140 ? `${i.stem.slice(0, 140)}…` : i.stem}</TableCell>
                  <TableCell>{i.section}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.responses}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(i.accuracy)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Math.round(i.avgTimeSec)}s</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
