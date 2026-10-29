"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startPractice, type StartState } from "@/lib/practice/actions";

export function StartPracticeForm({ examSlug, minutes }: { examSlug: string; minutes: number }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startPractice, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="examSlug" value={examSlug} />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">How do you want to take it?</legend>
        {[
          { value: "TIMED", title: "Timed", body: `${minutes} minutes, MCAT pace. Submits automatically when time runs out.` },
          { value: "UNTIMED", title: "Untimed", body: "No clock. Take your time and focus on reasoning." },
        ].map((o, i) => (
          <label
            key={o.value}
            className="flex cursor-pointer gap-3 rounded-xl border bg-white p-4 has-[:checked]:border-navy has-[:checked]:ring-1 has-[:checked]:ring-navy"
          >
            <input type="radio" name="mode" value={o.value} defaultChecked={i === 0} className="mt-1 accent-navy" />
            <span>
              <span className="block font-medium">{o.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{o.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 px-6">
        {pending ? "Starting…" : "Start practice set"}
      </Button>
      <p className="text-xs text-muted-foreground">No account needed. Your progress saves automatically in this browser.</p>
    </form>
  );
}
