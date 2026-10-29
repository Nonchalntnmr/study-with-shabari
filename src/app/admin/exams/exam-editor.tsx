import { Button } from "@/components/ui/button";
import { saveExam } from "@/lib/admin/editor-actions";
import { EditorForm } from "../_components/editor-form";
import { Field, SectionSelect, inputClass, textareaClass } from "../_components/fields";

type Existing = { id: string; title: string; slug: string; description: string; section: string; timeLimitSec: number; isSample: boolean };

export function ExamEditor({ exam }: { exam: Existing | null }) {
  return (
    <EditorForm action={saveExam}>
      {exam && <input type="hidden" name="id" value={exam.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="e-title">
          <input id="e-title" name="title" required maxLength={200} defaultValue={exam?.title} className={inputClass} />
        </Field>
        <Field label="URL slug" htmlFor="e-slug" hint="Lowercase letters, digits and dashes. Appears in /practice/…">
          <input id="e-slug" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,80}" defaultValue={exam?.slug} className={inputClass} />
        </Field>
      </div>
      <Field label="Description" htmlFor="e-description">
        <textarea id="e-description" name="description" rows={2} required maxLength={1000} defaultValue={exam?.description} className={textareaClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Section" htmlFor="e-section" hint="Questions must come from this section.">
          <SectionSelect id="e-section" defaultValue={exam?.section} />
        </Field>
        <Field label="Time limit (minutes)" htmlFor="e-timeLimitMinutes" hint="Used when a student picks timed mode. MCAT pace is about 1.6 minutes a question.">
          <input id="e-timeLimitMinutes" name="timeLimitMinutes" type="number" min={1} max={600} required defaultValue={exam ? Math.round(exam.timeLimitSec / 60) : 13} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 pt-7 text-sm">
          <input type="checkbox" name="isSample" defaultChecked={exam?.isSample} /> Free sample set
        </label>
      </div>
      <Button type="submit">{exam ? "Save details" : "Create draft exam"}</Button>
    </EditorForm>
  );
}
