"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { importContent, type ImportResult } from "@/lib/admin/editor-actions";
import { cn } from "@/lib/utils";
import { inputClass, textareaClass } from "../_components/fields";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(importContent, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      <fieldset disabled={pending} className="contents">
        <div className="space-y-1.5">
          <label htmlFor="file" className="text-sm font-medium">JSON file</label>
          <input id="file" name="file" type="file" accept="application/json,.json" className="block text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="json" className="text-sm font-medium">Or paste JSON</label>
          <textarea id="json" name="json" rows={12} spellCheck={false} className={`${textareaClass} font-mono text-xs`} placeholder='{ "version": 1, "topics": [...], "exams": [...] }' />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">Import as</label>
            <select id="status" name="status" defaultValue="DRAFT" className={`${inputClass} w-40`}>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">In review</option>
            </select>
          </div>
          <Button type="submit" name="intent" value="validate" variant="outline">Validate</Button>
          <Button type="submit" name="intent" value="import">Import</Button>
        </div>
      </fieldset>
      {pending && <p className="text-sm text-muted-foreground">Working…</p>}
      {state && !pending && (
        <div role="status" className={cn("space-y-2 rounded-lg px-4 py-3 text-sm", state.ok ? "bg-success-soft" : "bg-danger-soft")}>
          <p className={cn("font-medium", state.ok ? "text-success" : "text-danger")}>{state.message}</p>
          {state.summary && (
            <p>
              {state.summary.exams} exam{state.summary.exams === 1 ? "" : "s"} · {state.summary.passages} passage{state.summary.passages === 1 ? "" : "s"} · {state.summary.questions} question{state.summary.questions === 1 ? "" : "s"} · {state.summary.topics} topic{state.summary.topics === 1 ? "" : "s"}
            </p>
          )}
          {state.issues && (
            <ul className="max-h-72 list-disc space-y-0.5 overflow-auto pl-5 font-mono text-xs">
              {state.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
