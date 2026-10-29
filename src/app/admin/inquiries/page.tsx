import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { setInquiryStatus, saveInquiryNote } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "../_components/action-form";
import { Empty, PageHeader, StatusBadge, formatDate, selectClass } from "../_components/ui";
import Link from "next/link";

const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"] as const;
type Status = (typeof STATUSES)[number];

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // Layouts don't re-run on client navigation, so every page checks for itself.
  await requireAdmin();
  const { status } = await searchParams;
  const filter = STATUSES.find((s) => s === status) as Status | undefined;

  const [inquiries, counts] = await Promise.all([
    db.inquiry.findMany({
      where: filter ? { status: filter } : { status: { not: "SPAM" } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { emails: { select: { id: true, status: true, subject: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 3 } },
    }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <>
      <PageHeader title="Inquiries" description="Messages from the contact and consultation forms. Replies go out from your own email; this is where you track them." />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/inquiries" className={`rounded-full border px-3 py-1 text-sm ${!filter ? "bg-navy text-white" : "hover:bg-muted"}`}>
          Open
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/inquiries?status=${s}`} className={`rounded-full border px-3 py-1 text-sm ${filter === s ? "bg-navy text-white" : "hover:bg-muted"}`}>
            {s.replace("_", " ").toLowerCase()} ({countOf[s] ?? 0})
          </Link>
        ))}
      </nav>

      {inquiries.length === 0 ? (
        <Empty>No inquiries here.</Empty>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <li key={q.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{q.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <a className="underline-offset-4 hover:underline" href={`mailto:${q.email}`}>{q.email}</a>
                    {" · "}{q.kind.toLowerCase()}{q.testDate ? ` · test date ${q.testDate}` : ""}{" · "}{formatDate(q.createdAt)}
                  </p>
                </div>
                <StatusBadge status={q.status} />
              </div>

              {/* Rendered as text, never as HTML. */}
              <p className="mt-3 whitespace-pre-wrap text-sm">{q.message}</p>

              {q.emails.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Automatic emails: {q.emails.map((e) => `${e.subject} (${e.status.replace("_", " ").toLowerCase()})`).join("; ")}
                </p>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr]">
                <ActionForm action={setInquiryStatus}>
                  <input type="hidden" name="id" value={q.id} />
                  <label className="sr-only" htmlFor={`status-${q.id}`}>Status</label>
                  <select id={`status-${q.id}`} name="status" defaultValue={q.status} className={selectClass}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">Update</Button>
                </ActionForm>
                <ActionForm action={saveInquiryNote} className="items-start">
                  <input type="hidden" name="id" value={q.id} />
                  <label className="sr-only" htmlFor={`note-${q.id}`}>Private note</label>
                  <Textarea id={`note-${q.id}`} name="note" defaultValue={q.adminNote ?? ""} maxLength={2000} rows={2} placeholder="Private note (only admins see this)" className="min-w-60 flex-1" />
                  <Button type="submit" size="sm" variant="outline">Save note</Button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
