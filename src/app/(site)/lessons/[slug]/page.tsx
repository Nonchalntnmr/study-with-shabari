import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AiNote, DraftBadge } from "@/components/lesson/badges";
import { StartLessonForm } from "@/components/lesson/start-lesson-form";
import { getViewer } from "@/lib/exam/service";
import { isQuestionStep } from "@/lib/lessons/flow";
import { findLesson } from "@/lib/lessons/service";
import { containsAi } from "@/lib/lessons/snapshot";
import { AAMC_DISCLAIMER } from "@/lib/site";

// Drafts are visible only in previews and to admins, so this page is read per request.
export const instant = false;
export const metadata: Metadata = { title: "Lesson" };

export default function LessonIntroPage({ params }: PageProps<"/lessons/[slug]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-5 py-24 text-quiet">Loading the lesson…</p>}>
      {params.then(({ slug }) => (
        <Intro slug={slug} />
      ))}
    </Suspense>
  );
}

const HOW = [
  "Read a short explanation.",
  "Answer a question, and say how sure you are before you check.",
  "See why the right answer is right and why yours wasn’t, with the misconception named.",
  "Try a new question on the same idea.",
];

async function Intro({ slug }: { slug: string }) {
  const viewer = await getViewer();
  const lesson = await findLesson(slug, viewer.isAdmin);
  if (!lesson) notFound();
  const s = lesson.snapshot;
  const questions = s.steps.filter(isQuestionStep).length;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-14 sm:px-8 sm:pt-20">
      {lesson.mode === "preview" && <DraftBadge note />}
      <h1 className="mt-6 text-[clamp(2.75rem,8vw,4.75rem)]">{s.title}</h1>
      <p className="mt-6 max-w-[60ch] text-[1.1875rem] leading-relaxed text-specimen/90">{s.summary}</p>

      <section aria-labelledby="objectives-h" className="mt-12">
        <h2 id="objectives-h" className="text-[1.75rem]">
          By the end you should be able to
        </h2>
        <ul className="mt-5 grid gap-3 border-t border-hairline pt-5">
          {s.objectives.map((o) => (
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
          {questions} questions. Nothing is timed, and you’ll see the reasoning after every answer.
        </p>
      </section>

      <div className="mt-12">
        <StartLessonForm slug={s.slug} />
      </div>
      <div className="mt-12 space-y-2 border-t border-hairline pt-6">
        {lesson.mode === "published" && containsAi(s) && <AiNote />}
        <p className="text-sm text-quiet">{AAMC_DISCLAIMER}</p>
      </div>
    </div>
  );
}
