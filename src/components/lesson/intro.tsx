import type { ReactNode } from "react";
import { AiNote, DraftBadge } from "@/components/lesson/badges";
import { AAMC_DISCLAIMER } from "@/lib/site";

// The lesson's opening page. The public page (/lessons/[slug]) and the admin draft preview
// (/admin/lessons/[id]/preview) render the same thing; only the start button differs.

export type IntroLesson = { mode: "published" | "preview"; title: string; summary: string; objectives: string[]; questions: number; ai: boolean };

const HOW = [
  "Read a short explanation.",
  "Answer a question, and say how sure you are before you check.",
  "See why the right answer is right and why yours wasn’t, with the misconception named.",
  "Try a new question on the same idea.",
];

export function LessonIntro({ lesson, start }: { lesson: IntroLesson; start: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-14 sm:px-8 sm:pt-20">
      {lesson.mode === "preview" && <DraftBadge note />}
      <h1 className="mt-6 text-[clamp(2.75rem,8vw,4.75rem)]">{lesson.title}</h1>
      <p className="mt-6 max-w-[60ch] text-[1.1875rem] leading-relaxed text-specimen/90">{lesson.summary}</p>

      <section aria-labelledby="objectives-h" className="mt-12">
        <h2 id="objectives-h" className="text-[1.75rem]">
          By the end you should be able to
        </h2>
        <ul className="mt-5 grid gap-3 border-t border-hairline pt-5">
          {lesson.objectives.map((o) => (
            <li key={o} className="flex gap-3 text-[1.0625rem] text-specimen/90">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-eosin" />
              {o}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-h" className="mt-12">
        <h2 id="how-h" className="text-[1.75rem]">
          How it works
        </h2>
        <ol className="mt-5 grid gap-3 border-t border-hairline pt-5">
          {HOW.map((h, i) => (
            <li key={h} className="grid grid-cols-[2rem_1fr] text-[1.0625rem] text-specimen/90">
              <span className="tabular-nums text-quiet">{i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[1.0625rem] text-specimen/90">
          {lesson.questions} questions. Nothing is timed, and you’ll see the reasoning after every answer.
        </p>
      </section>

      <div className="mt-12">{start}</div>
      <div className="mt-12 space-y-2 border-t border-hairline pt-6">
        {lesson.mode === "published" && lesson.ai && <AiNote />}
        <p className="text-sm text-quiet">{AAMC_DISCLAIMER}</p>
      </div>
    </div>
  );
}
