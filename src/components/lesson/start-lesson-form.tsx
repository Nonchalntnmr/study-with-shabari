"use client";

import { useActionState } from "react";
import { startLesson, type LessonFormState } from "@/lib/lessons/actions";

export function StartLessonForm({ slug, label = "Start the lesson" }: { slug: string; label?: string }) {
  const [state, action, pending] = useActionState<LessonFormState, FormData>(startLesson, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center rounded-full bg-eosin px-7 text-[1rem] font-semibold text-specimen transition-colors hover:bg-[#E46C91] disabled:opacity-60"
      >
        {pending ? "Starting…" : label}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-[#A3304F]">
          {state.error}
        </p>
      )}
      <p className="text-sm text-quiet">No account needed. Your answers stay with this browser.</p>
    </form>
  );
}
