import { Button } from "@/components/ui/button";
import { savePassage } from "@/lib/admin/editor-actions";
import { EditorForm } from "../_components/editor-form";
import { Field, SectionSelect, inputClass, textareaClass } from "../_components/fields";

type Existing = { id: string; section: string; title: string; body: string; source: string | null };

export function PassageEditor({ passage }: { passage: Existing | null }) {
  return (
    <EditorForm action={savePassage}>
      {passage && <input type="hidden" name="id" value={passage.id} />}
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Section" htmlFor="p-section">
          <SectionSelect id="p-section" defaultValue={passage?.section} />
        </Field>
        <Field label="Title" htmlFor="p-title" hint="Shown above the passage in the exam.">
          <input id="p-title" name="title" required maxLength={200} defaultValue={passage?.title} className={inputClass} />
        </Field>
      </div>
      <Field
        label="Passage text"
        htmlFor="p-body"
        hint="Plain text. Leave a blank line between paragraphs. Students’ highlights are stored as character positions in each paragraph, so keep edits small once students have used it."
      >
        <textarea id="p-body" name="body" rows={16} required defaultValue={passage?.body} className={`${textareaClass} font-reading`} />
      </Field>
      <Field label="Source (optional)" htmlFor="p-source" hint="Cite material the passage adapts.">
        <input id="p-source" name="source" maxLength={500} defaultValue={passage?.source ?? ""} className={inputClass} />
      </Field>
      <Button type="submit">{passage ? "Save passage" : "Create draft passage"}</Button>
    </EditorForm>
  );
}
