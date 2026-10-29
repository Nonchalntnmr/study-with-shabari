import { requireAdmin } from "@/lib/auth/dal";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  setExamStatus,
  setPassageStatus,
  setQuestionStatus,
  setResourceStatus,
  setTestimonialConsent,
  setTestimonialStatus,
  type ActionResult,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { ActionForm } from "../_components/action-form";
import { Empty, PageHeader, StatusBadge, formatDate, selectClass } from "../_components/ui";

const TABS = ["exams", "questions", "passages", "resources", "testimonials"] as const;
type Tab = (typeof TABS)[number];
const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
const PAGE_SIZE = 40;

type StatusAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function StatusForm({ id, status, action }: { id: string; status: string; action: StatusAction }) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`s-${id}`}>Status</label>
      <select id={`s-${id}`} name="status" defaultValue={status} className={selectClass}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.toLowerCase()}</option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline">Set</Button>
    </ActionForm>
  );
}

function Row({ title, meta, status, children }: { title: string; meta: string; status: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <StatusBadge status={status} />
      {children}
    </li>
  );
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; page?: string }> }) {
  // Layouts don't re-run on client navigation, so every page checks for itself.
  await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t === sp.tab) ?? "exams";
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where = status ? { status } : {};
  const skip = (page - 1) * PAGE_SIZE;

  let body: React.ReactNode;
  let total = 0;

  if (tab === "exams") {
    const [rows, n] = await Promise.all([
      db.exam.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE, include: { _count: { select: { items: true, attempts: true } } } }),
      db.exam.count({ where }),
    ]);
    total = n;
    body = rows.length === 0 ? <Empty>No exams.</Empty> : (
      <ul className="space-y-2">
        {rows.map((e) => (
          <Row key={e.id} title={e.title} meta={`${e.section} · ${e._count.items} questions · ${e._count.attempts} attempts${e.isSample ? " · sample" : ""}`} status={e.status}>
            <StatusForm id={e.id} status={e.status} action={setExamStatus} />
          </Row>
        ))}
      </ul>
    );
  } else if (tab === "questions") {
    const [rows, n] = await Promise.all([
      db.question.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: PAGE_SIZE, select: { id: true, stem: true, section: true, status: true, difficulty: true, externalId: true } }),
      db.question.count({ where }),
    ]);
    total = n;
    body = rows.length === 0 ? <Empty>No questions.</Empty> : (
      <ul className="space-y-2">
        {rows.map((q) => (
          <Row key={q.id} title={q.stem.length > 110 ? `${q.stem.slice(0, 110)}…` : q.stem} meta={`${q.section}${q.difficulty ? ` · difficulty ${q.difficulty}` : ""}${q.externalId ? ` · ${q.externalId}` : ""}`} status={q.status}>
            <StatusForm id={q.id} status={q.status} action={setQuestionStatus} />
          </Row>
        ))}
      </ul>
    );
  } else if (tab === "passages") {
    const [rows, n] = await Promise.all([
      db.passage.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: PAGE_SIZE, include: { _count: { select: { questions: true } } } }),
      db.passage.count({ where }),
    ]);
    total = n;
    body = rows.length === 0 ? <Empty>No passages.</Empty> : (
      <ul className="space-y-2">
        {rows.map((p) => (
          <Row key={p.id} title={p.title} meta={`${p.section} · ${p._count.questions} questions`} status={p.status}>
            <StatusForm id={p.id} status={p.status} action={setPassageStatus} />
          </Row>
        ))}
      </ul>
    );
  } else if (tab === "resources") {
    const [rows, n] = await Promise.all([
      db.resource.findMany({ where, orderBy: [{ position: "asc" }, { title: "asc" }], skip, take: PAGE_SIZE }),
      db.resource.count({ where }),
    ]);
    total = n;
    body = rows.length === 0 ? <Empty>No resources.</Empty> : (
      <ul className="space-y-2">
        {rows.map((r) => (
          <Row key={r.id} title={r.title} meta={`${r.kind.toLowerCase().replace("_", " ")}${r.section ? ` · ${r.section}` : ""}${r.url || r.examId ? "" : " · no link yet (shows as coming soon)"}`} status={r.status}>
            <StatusForm id={r.id} status={r.status} action={setResourceStatus} />
          </Row>
        ))}
      </ul>
    );
  } else {
    const [rows, n] = await Promise.all([
      db.testimonial.findMany({ where, orderBy: [{ position: "asc" }, { createdAt: "desc" }], skip, take: PAGE_SIZE }),
      db.testimonial.count({ where }),
    ]);
    total = n;
    body = rows.length === 0 ? <Empty>No testimonials. Real ones only, with the student&apos;s written consent.</Empty> : (
      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium">{t.authorName}{t.authorDetail ? ` — ${t.authorDetail}` : ""}</p>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-2 text-sm italic">“{t.quote}”</p>
            <p className="mt-1 text-xs text-muted-foreground">Added {formatDate(t.createdAt)} · consent {t.consentConfirmed ? "recorded" : "not recorded"}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <ActionForm action={setTestimonialConsent}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="consent" value={t.consentConfirmed ? "false" : "true"} />
                <Button type="submit" size="sm" variant="outline">{t.consentConfirmed ? "Withdraw consent" : "Record consent"}</Button>
              </ActionForm>
              <StatusForm id={t.id} status={t.status} action={setTestimonialStatus} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    q.set("tab", over.tab ?? tab);
    const s = "status" in over ? over.status : status;
    if (s) q.set("status", s);
    if (over.page && over.page !== "1") q.set("page", over.page);
    return `/admin/content?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title="Content" description="Publishing is checked: a question needs exactly one correct answer and an explanation, an exam needs published questions, and a testimonial needs recorded consent." />
      <nav aria-label="Content type" className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={link({ tab: t, status: undefined, page: "1" })} className={`rounded-full border px-3 py-1 text-sm capitalize ${tab === t ? "bg-navy text-white" : "hover:bg-muted"}`}>
            {t}
          </Link>
        ))}
      </nav>
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={link({ status: undefined, page: "1" })} className={`rounded-full px-2.5 py-0.5 ${!status ? "bg-muted font-medium" : "hover:bg-muted"}`}>all</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={link({ status: s, page: "1" })} className={`rounded-full px-2.5 py-0.5 ${status === s ? "bg-muted font-medium" : "hover:bg-muted"}`}>{s.toLowerCase()}</Link>
        ))}
      </nav>
      {body}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link({ page: String(page - 1) })} className="underline-offset-4 hover:underline">← Newer</Link> : <span />}
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          {page < pages ? <Link href={link({ page: String(page + 1) })} className="underline-offset-4 hover:underline">Older →</Link> : <span />}
        </div>
      )}
    </>
  );
}
