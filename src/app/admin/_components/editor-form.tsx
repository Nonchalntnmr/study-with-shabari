"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Like ActionForm, for long editors. Submits through a transition instead of
 * `<form action>`, because React resets uncontrolled fields after a form
 * action, and a failed validation would wipe the author's edits.
 */
export function EditorForm({ action, children, className }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(data));
      }}
      className={cn("space-y-5", className)}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {pending && <p className="text-sm text-muted-foreground">Saving…</p>}
      {state && !pending && (
        <p role="status" className={cn("rounded-lg px-3 py-2 text-sm", state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
