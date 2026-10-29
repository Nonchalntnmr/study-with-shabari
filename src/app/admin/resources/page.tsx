import { Button } from "@/components/ui/button";
import { saveResource } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { EditorForm } from "../_components/editor-form";
import { Field, SECTIONS, Section, inputClass, textareaClass } from "../_components/fields";
import { PageHeader, StatusBadge } from "../_components/ui";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

type Row = { id: string; title: string; slug: string; description: string; kind: string; section: string | null; url: string | null; examId: string | null; position: number; status: string };

function ResourceForm({ r, exams }: { r: Row | null; exams: { id: string; title: string; status: string }[] }) {
  const k = r?.id ?? "new";
  return (
    <EditorForm action={saveResource} className="space-y-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor={`title-${k}`}>
          <input id={`title-${k}`} name="title" required maxLength={200} defaultValue={r?.title} className={inputClass} />
        </Field>
        <Field label="Slug" htmlFor={`slug-${k}`}>
          <input id={`slug-${k}`} name="slug" required defaultValue={r?.slug} className={inputClass} />
        </Field>
      </div>
      <Field label="Description" htmlFor={`desc-${k}`}>
        <textarea id={`desc-${k}`} name="description" rows={2} required maxLength={500} defaultValue={r?.description} className={textareaClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Kind" htmlFor={`kind-${k}`}>
          <select id={`kind-${k}`} name="kind" defaultValue={r?.kind ?? "NOTES"} className={inputClass}>
            <option value="NOTES">Notes</option>
            <option value="PRACTICE_SET">Practice set</option>
            <option value="GUIDE">Guide</option>
          </select>
        </Field>
        <Field label="Section" htmlFor={`section-${k}`}>
          <select id={`section-${k}`} name="section" defaultValue={r?.section ?? ""} className={inputClass}>
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Order" htmlFor={`pos-${k}`}>
          <input id={`pos-${k}`} name="position" type="number" min={0} defaultValue={r?.position ?? 0} className={inputClass} />
        </Field>
        <Field label="Status" htmlFor={`status-${k}`}>
          <select id={`status-${k}`} name="status" defaultValue={r?.status ?? "DRAFT"} className={inputClass}>
            {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>{s.toLowerCase()}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Link (https)" htmlFor={`url-${k}`} hint="For notes, e.g. a shared Google Doc. Empty shows “Link coming soon”.">
          <input id={`url-${k}`} name="url" type="url" defaultValue={r?.url ?? ""} placeholder="https://" className={inputClass} />
        </Field>
        <Field label="Or an in-app practice set" htmlFor={`exam-${k}`} hint="Shown only while that exam is published.">
          <select id={`exam-${k}`} name="examId" defaultValue={r?.examId ?? ""} className={inputClass}>
            <option value="">None</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.title} ({e.status.toLowerCase()})</option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" size="sm">{r ? "Save resource" : "Add resource"}</Button>
    </EditorForm>
  );
}

export default async function ResourcesPage() {
  await requireAdmin();
  const [resources, exams] = await Promise.all([
    db.resource.findMany({ orderBy: [{ position: "asc" }, { title: "asc" }] }),
    db.exam.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, status: true } }),
  ]);
  return (
    <>
      <PageHeader title="Resources" description="The free notes and practice sets listed on /resources. Only published resources appear on the site." />
      <div className="space-y-6">
        <Section title="Add a resource">
          <ResourceForm r={null} exams={exams} />
        </Section>
        {resources.map((r) => (
          <section key={r.id} className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{r.title}</h2>
              <StatusBadge status={r.status} />
            </div>
            <ResourceForm r={r} exams={exams} />
          </section>
        ))}
      </div>
    </>
  );
}
