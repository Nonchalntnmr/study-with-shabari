import { Button } from "@/components/ui/button";
import { saveQuestion } from "@/lib/admin/editor-actions";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/storage";
import { EditorForm } from "../_components/editor-form";
import { Field, SECTIONS, SectionSelect, inputClass, textareaClass } from "../_components/fields";

const LABELS = ["A", "B", "C", "D"] as const;

type Existing = {
  id: string;
  section: string;
  passageId: string | null;
  stem: string;
  explanation: string;
  difficulty: number | null;
  choices: { label: string; text: string; rationale: string | null; isCorrect: boolean }[];
  topicIds: string[];
  figure: { id: string; provider: string; storageKey: string; alt: string } | null;
};

export async function QuestionEditor({ question, defaultSection, defaultPassageId }: { question: Existing | null; defaultSection?: string; defaultPassageId?: string }) {
  const [passages, topics] = await Promise.all([
    db.passage.findMany({ orderBy: [{ section: "asc" }, { title: "asc" }], select: { id: true, title: true, section: true, status: true } }),
    db.topic.findMany({ orderBy: [{ section: "asc" }, { name: "asc" }], select: { id: true, name: true, section: true } }),
  ]);
  const choice = (label: string) => question?.choices.find((c) => c.label === label);
  const correct = question?.choices.find((c) => c.isCorrect)?.label;
  const section = question?.section ?? defaultSection ?? "CP";

  return (
    <EditorForm action={saveQuestion}>
      {question && <input type="hidden" name="id" value={question.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Section" htmlFor="q-section">
          <SectionSelect id="q-section" defaultValue={section} />
        </Field>
        <Field label="Passage" htmlFor="q-passageId" hint="Leave as discrete for a standalone question." className="sm:col-span-2">
          <select id="q-passageId" name="passageId" defaultValue={question?.passageId ?? defaultPassageId ?? ""} className={inputClass}>
            <option value="">Discrete (no passage)</option>
            {passages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.section} · {p.title} ({p.status.toLowerCase()})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Question stem" htmlFor="q-stem">
        <textarea id="q-stem" name="stem" rows={4} required defaultValue={question?.stem} className={textareaClass} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Choices: mark the one correct answer</legend>
        {LABELS.map((l) => (
          <div key={l} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-start">
            <label className="flex items-center gap-2 pt-1.5 text-sm font-semibold">
              <input type="radio" name="correct" value={l} defaultChecked={correct === l} required className="accent-navy" aria-label={`${l} is correct`} />
              {l}
            </label>
            <div>
              <label htmlFor={`q-choice${l}`} className="sr-only">
                Choice {l} text
              </label>
              <textarea id={`q-choice${l}`} name={`choice${l}`} rows={2} required placeholder={`Choice ${l}`} defaultValue={choice(l)?.text} className={textareaClass} />
            </div>
            <div>
              <label htmlFor={`q-rationale${l}`} className="sr-only">
                Why {l} is right or wrong
              </label>
              <textarea id={`q-rationale${l}`} name={`rationale${l}`} rows={2} placeholder="Why it’s right or wrong (shown after submitting)" defaultValue={choice(l)?.rationale ?? ""} className={textareaClass} />
            </div>
          </div>
        ))}
      </fieldset>

      <Field label="Explanation" htmlFor="q-explanation" hint="Required before publishing. Shown on the results page.">
        <textarea id="q-explanation" name="explanation" rows={6} defaultValue={question?.explanation} className={textareaClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Topics</legend>
          <p className="mb-2 text-xs text-muted-foreground">Only topics from the question’s own section are accepted. Manage topics on the Topics page.</p>
          <div className="space-y-3">
            {SECTIONS.filter((s) => topics.some((t) => t.section === s.value)).map((s) => (
              <div key={s.value}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {topics
                    .filter((t) => t.section === s.value)
                    .map((t) => (
                      <label key={t.id} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="topics" value={t.id} defaultChecked={question?.topicIds.includes(t.id)} />
                        {t.name}
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
        <Field label="Difficulty" htmlFor="q-difficulty" hint="1 easier · 5 harder">
          <select id="q-difficulty" name="difficulty" defaultValue={question?.difficulty?.toString() ?? ""} className={inputClass}>
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Figure (optional)</legend>
        {question?.figure && (
          <div className="flex flex-wrap items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded diagram */}
            <img src={assetUrl(question.figure)} alt={question.figure.alt} className="max-h-40 rounded border" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeFigure" value="1" /> Remove this figure
            </label>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={question?.figure ? "Replace with" : "Image"} htmlFor="q-figure" hint="PNG, JPEG, GIF or WebP, up to 4 MB.">
            <input id="q-figure" name="figure" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="text-sm" />
          </Field>
          <Field label="Alt text" htmlFor="q-figureAlt" hint="Describe what the figure shows. Required with an image.">
            <input id="q-figureAlt" name="figureAlt" className={inputClass} defaultValue={question?.figure?.alt ?? ""} maxLength={300} />
          </Field>
        </div>
      </fieldset>

      <Button type="submit">{question ? "Save question" : "Create draft question"}</Button>
    </EditorForm>
  );
}
