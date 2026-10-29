import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, StatusBadge, formatDate } from "../_components/ui";

export default async function AuditPage() {
  // Layouts don't re-run on client navigation, so every page checks for itself.
  await requireAdmin();
  const [logs, emails] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 25, select: { id: true, template: true, to: true, subject: true, status: true, error: true, createdAt: true } }),
  ]);

  return (
    <>
      <PageHeader title="Audit log" description="Sensitive admin and account actions, newest first. Entries are append-only." />
      {logs.length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(l.createdAt)}</TableCell>
                  <TableCell className="text-sm">{l.actorEmail ?? "system"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.entityType}{l.entityId ? ` ${l.entityId.slice(0, 8)}…` : ""}</TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{l.metadata ? JSON.stringify(l.metadata) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="mb-2 mt-10 text-sm font-semibold">Recent emails</h2>
      {emails.length === 0 ? (
        <Empty>No emails have been sent or queued.</Empty>
      ) : (
        <ul className="space-y-2">
          {emails.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm">
              <span className="min-w-0 truncate">{e.subject} <span className="text-muted-foreground">to {e.to}</span></span>
              <span className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                <span className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
              </span>
              {e.error && <span className="w-full text-xs text-danger">{e.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
