import Link from "next/link";
import type { ReactNode } from "react";

/** Admin chrome around a draft preview. The lesson inside renders exactly as students would see it. */
export function PreviewFrame({ lessonId, title, children }: { lessonId: string; title: string; children: ReactNode }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Previewing the current draft of <span className="font-medium text-ink">{title}</span>. Only admins can open this page, and nothing here
          is counted in the lesson funnel.
        </p>
        <Link href={`/admin/lessons/${lessonId}`} className="text-navy underline underline-offset-4">
          Back to the lesson
        </Link>
      </div>
      <div className="public overflow-hidden rounded-xl border" data-testid="lesson-preview">
        {children}
      </div>
    </>
  );
}
