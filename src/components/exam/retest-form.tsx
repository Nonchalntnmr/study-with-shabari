"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { retestMissed, type StartState } from "@/lib/practice/actions";

export function RetestForm({ attemptId, missed }: { attemptId: string; missed: number }) {
  const [state, action, pending] = useActionState<StartState, FormData>(retestMissed, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="attemptId" value={attemptId} />
      <Button type="submit" variant="outline" className="h-10 px-4" disabled={pending}>
        {pending ? "Starting…" : `Retest the ${missed} you missed`}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
