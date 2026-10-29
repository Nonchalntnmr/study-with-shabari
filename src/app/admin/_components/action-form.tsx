"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * A form wired to an admin server action. Shows the result inline and disables
 * its controls while the request is in flight. Works without JavaScript too.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={cn("flex flex-wrap items-center gap-2", className)}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state && (
        <p
          role="status"
          className={cn("w-full text-xs", state.ok ? "text-success" : "text-danger")}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
