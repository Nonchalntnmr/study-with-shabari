"use client";

import { useActionState } from "react";
import { startLesson, startLessonPreview, type LessonFormState } from "@/lib/lessons/actions";

/**
 * Starts an attempt. Students start the published lesson by slug; an admin's draft preview
 * (`previewLessonId`) starts a preview attempt that stays under /admin/lessons.
 */
export function StartLessonForm({ slug, previewLessonId, label = "Start the lesson" }: { slug: string; previewLessonId?: string; label?: string }) {
  const [state, action, pending] = useActionState<LessonFormState, FormData>(previewLessonId ? startLessonPreview : startLesson, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      {previewLessonId && <input type="hidden" name="id" value={previewLessonId} />}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center rounded-full bg-eosin px-7 text-[1rem] font-semibold text-white transition-colors hover:bg-eosin-ink disabled:opacity-60"
      >
        {pending ? "Starting…" : label}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-[#A3304F]">
          {state.error}
        </p>
      )}
      <p className="text-sm text-quiet">{previewLessonId ? "Preview answers are never counted in the lesson funnel." : "No account needed. Your answers stay with this browser."}</p>
    </form>
  );
}
