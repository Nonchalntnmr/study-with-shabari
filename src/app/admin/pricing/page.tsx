import { Button } from "@/components/ui/button";
import { savePricingPlan } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { EditorForm } from "../_components/editor-form";
import { Field, inputClass, textareaClass } from "../_components/fields";
import { PageHeader, StatusBadge } from "../_components/ui";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function PricingAdminPage() {
  await requireAdmin();
  const plans = await db.pricingPlan.findMany({ orderBy: { position: "asc" } });
  return (
    <>
      <PageHeader title="Pricing" description="Changes appear on the home and pricing pages within moments of saving." />
      <p role="note" className="mb-6 rounded-lg border border-mark bg-warning-soft px-3 py-2 text-sm">
        The Full MCAT package contents (10 sessions, 2 full-length exams, 2,000 questions, a study plan) came from the project brief and still need
        Shabari’s confirmation. Edit them here if anything differs. Payment is by Zelle after the consultation; never add bank details to these
        fields.
      </p>
      <div className="space-y-6">
        {plans.map((p) => (
          <section key={p.id} className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{p.name}</h2>
              <StatusBadge status={p.status} />
            </div>
            <EditorForm action={savePricingPlan} className="space-y-4">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name" htmlFor={`name-${p.id}`}>
                  <input id={`name-${p.id}`} name="name" required defaultValue={p.name} className={inputClass} />
                </Field>
                <Field label="Price" htmlFor={`price-${p.id}`} hint="Shown as written, e.g. $2,000 or Let’s talk.">
                  <input id={`price-${p.id}`} name="priceLabel" required defaultValue={p.priceLabel} className={inputClass} />
                </Field>
                <Field label="Detail" htmlFor={`detail-${p.id}`}>
                  <input id={`detail-${p.id}`} name="detail" defaultValue={p.detail ?? ""} className={inputClass} />
                </Field>
              </div>
              <Field label="Features (one per line)" htmlFor={`features-${p.id}`}>
                <textarea id={`features-${p.id}`} name="features" rows={5} defaultValue={p.features.join("\n")} className={textareaClass} />
              </Field>
              <Field label="Note (optional)" htmlFor={`note-${p.id}`}>
                <input id={`note-${p.id}`} name="note" defaultValue={p.note ?? ""} className={inputClass} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Button text" htmlFor={`cta-${p.id}`}>
                  <input id={`cta-${p.id}`} name="ctaLabel" required defaultValue={p.ctaLabel} className={inputClass} />
                </Field>
                <Field label="Button link" htmlFor={`href-${p.id}`} hint="A site path like /book, or https://…">
                  <input id={`href-${p.id}`} name="ctaHref" required defaultValue={p.ctaHref} className={inputClass} />
                </Field>
                <Field label="Order" htmlFor={`pos-${p.id}`}>
                  <input id={`pos-${p.id}`} name="position" type="number" min={0} defaultValue={p.position} className={inputClass} />
                </Field>
                <Field label="Status" htmlFor={`status-${p.id}`}>
                  <select id={`status-${p.id}`} name="status" defaultValue={p.status} className={inputClass}>
                    {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                      <option key={s} value={s}>{s.toLowerCase()}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="featured" defaultChecked={p.featured} /> Highlight this plan
              </label>
              <Button type="submit" size="sm">Save {p.name}</Button>
            </EditorForm>
          </section>
        ))}
      </div>
    </>
  );
}
