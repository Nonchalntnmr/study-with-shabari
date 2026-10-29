import { Button } from "@/components/ui/button";
import { setTestimonialStatus } from "@/lib/admin/actions";
import { saveTestimonial } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { EditorForm } from "../_components/editor-form";
import { Field, Section, inputClass, textareaClass } from "../_components/fields";
import { StatusControl } from "../_components/status-control";
import { PageHeader } from "../_components/ui";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

type T = { id: string; authorName: string; authorDetail: string | null; quote: string; consentConfirmed: boolean; position: number };

function TestimonialForm({ t }: { t: T | null }) {
  const k = t?.id ?? "new";
  return (
    <EditorForm action={saveTestimonial} className="space-y-4">
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <Field label="Name as the student wants it shown" htmlFor={`name-${k}`}>
          <input id={`name-${k}`} name="authorName" required maxLength={120} defaultValue={t?.authorName} className={inputClass} />
        </Field>
        <Field label="Detail (optional)" htmlFor={`detail-${k}`} hint="Only what they approved, e.g. a score they chose to share.">
          <input id={`detail-${k}`} name="authorDetail" maxLength={200} defaultValue={t?.authorDetail ?? ""} className={inputClass} />
        </Field>
        <Field label="Order" htmlFor={`pos-${k}`}>
          <input id={`pos-${k}`} name="position" type="number" min={0} defaultValue={t?.position ?? 0} className={inputClass} />
        </Field>
      </div>
      <Field label="Quote, exactly as they wrote it" htmlFor={`quote-${k}`}>
        <textarea id={`quote-${k}`} name="quote" rows={3} required maxLength={2000} defaultValue={t?.quote} className={textareaClass} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" defaultChecked={t?.consentConfirmed} className="mt-0.5" />
        <span>I have this student’s written permission to publish this quote with their name.</span>
      </label>
      <Button type="submit" size="sm">{t ? "Save testimonial" : "Add as draft"}</Button>
    </EditorForm>
  );
}

export default async function TestimonialsAdminPage() {
  await requireAdmin();
  const testimonials = await db.testimonial.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHeader title="Testimonials" description="Real quotes only, each with the student’s written permission. A testimonial can’t be published without recorded consent." />
      <div className="space-y-6">
        <Section title="Add a testimonial">
          <TestimonialForm t={null} />
        </Section>
        {testimonials.map((t) => (
          <section key={t.id} className="space-y-4 rounded-xl border bg-card p-5">
            <StatusControl id={t.id} status={t.status} action={setTestimonialStatus} />
            <TestimonialForm t={t} />
          </section>
        ))}
      </div>
    </>
  );
}
