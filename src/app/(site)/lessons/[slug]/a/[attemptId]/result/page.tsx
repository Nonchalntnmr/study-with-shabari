import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PrimaryCta, SecondaryCta } from "@/components/home/sections";
import { AiNote, DraftBadge } from "@/components/lesson/badges";
import { getViewer } from "@/lib/exam/service";
import { CONFIDENCE_LABEL, lessonResult, type AnswerSummary } from "@/lib/lessons/flow";
import { loadLessonAttempt, practiceSetsFor } from "@/lib/lessons/service";
import { containsAi } from "@/lib/lessons/snapshot";
import { sectionShort, type SectionCode } from "@/lib/site";

export const instant = false;
export const metadata: Metadata = { title: "Lesson results", robots: { index: false, follow: false } };

export default function LessonResultPage({ params }: PageProps<"/lessons/[slug]/a/[attemptId]/result">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-5 py-24 text-quiet">Putting your results together…</p>}>
      {params.then(({ slug, attemptId }) => (
        <Result slug={slug} attemptId={attemptId} />
      ))}
    </Suspense>
  );
}

function Answer({ a, testId }: { a: AnswerSummary | null; testId: string }) {
  if (!a) return <span className="text-quiet">Not answered</span>;
  return (
    <span data-testid={testId} data-correct={a.isCorrect}>
      <span className={`font-semibold ${a.isCorrect ? "text-fixative-ink" : "text-[#A3304F]"}`}>{a.isCorrect ? "Right" : "Wrong"}</span>
      <span className="text-specimen/85">
        {" "}
        ({a.label}), {CONFIDENCE_LABEL[a.confidence].toLowerCase()}
      </span>
      {a.misconception && <span className="mt-1 block text-sm text-quiet">{a.misconception}</span>}
    </span>
  );
}

async function Result({ slug, attemptId }: { slug: string; attemptId: string }) {
  const a = await loadLessonAttempt(attemptId, await getViewer());
  if (!a || a.snapshot.slug !== slug) notFound();
  const s = a.snapshot;
  const r = lessonResult(s, a.answers);
  if (!r.complete) redirect(`/lessons/${slug}/a/${attemptId}`);
  const sets = await practiceSetsFor(r.missedSections);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-10 sm:px-8 sm:pt-16">
      {a.mode === "preview" && <DraftBadge />}
      <h1 className="mt-6 text-[clamp(2.5rem,7vw,4rem)]">What this lesson showed</h1>
      <p className="mt-5 max-w-[60ch] text-[1.125rem] leading-relaxed text-specimen/90">
        You answered {r.answered} questions. That’s enough to see which ideas held and which didn’t, and not enough to say anything about your MCAT score.
      </p>

      <section aria-labelledby="compare-h" className="mt-14">
        <h2 id="compare-h" className="text-[1.875rem]">
          First try and retest
        </h2>
        <ul className="mt-5 border-t border-hairline" data-testid="first-vs-retest">
          {r.concepts.map((c) => (
            <li key={c.concept} className="border-b border-hairline py-5" data-testid="result-row" data-concept={c.concept}>
              <p className="text-[1.0625rem] font-medium text-specimen">
                {c.label}
                <span className="ml-2 text-sm font-normal text-quiet">{sectionShort[c.section as SectionCode] ?? c.section}</span>
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-[1.0625rem]">
                <div>
                  <dt className="text-sm text-quiet">First try</dt>
                  <dd className="mt-1">
                    <Answer a={c.first} testId="first" />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-quiet">Retest</dt>
                  <dd className="mt-1">{c.retest ? <Answer a={c.retest} testId="retest" /> : <span className="text-quiet">None: a passage question</span>}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mis-h" className="mt-14">
        <h2 id="mis-h" className="text-[1.875rem]">
          Misconceptions that came up
        </h2>
        {r.misconceptions.length === 0 ? (
          <p className="mt-4 text-[1.0625rem] text-specimen/90">None of your answers matched a misconception this lesson checks for.</p>
        ) : (
          <ul className="mt-5 grid gap-3 border-t border-hairline pt-5" data-testid="misconceptions-hit">
            {r.misconceptions.map((m) => (
              <li key={m.name} className="text-[1.0625rem] text-specimen/90">
                <span className="font-semibold text-hema">{m.name}</span>
                <span className="block text-sm text-quiet">{m.concept}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cal-h" className="mt-14">
        <h2 id="cal-h" className="text-[1.875rem]">
          How sure you were
        </h2>
        <div className="mt-4 space-y-4 text-[1.0625rem] leading-relaxed text-specimen/90">
          {r.sureWrong.length > 0 && (
            <p data-testid="sure-wrong">
              You were sure and wrong on <strong className="font-semibold">{r.sureWrong.join("; ")}</strong>. Start your review there: a confident wrong answer usually means a rule
              learned slightly wrong, and it won’t feel like a gap until it costs points.
            </p>
          )}
          {r.unsureRight.length > 0 && (
            <p>
              You were right but not sure on <strong className="font-semibold">{r.unsureRight.join("; ")}</strong>. Worth one more pass so it holds on test day.
            </p>
          )}
          {r.sureWrong.length === 0 && r.unsureRight.length === 0 && <p>Your confidence matched your answers every time.</p>}
        </div>
      </section>

      <section aria-labelledby="covered-h" className="mt-14">
        <h2 id="covered-h" className="text-[1.875rem]">
          This lesson covered
        </h2>
        <ul className="mt-5 grid gap-3 border-t border-hairline pt-5">
          {s.objectives.map((o) => (
            <li key={o} className="flex gap-3 text-[1.0625rem] text-specimen/90">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-hema/50" />
              {o}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="next-h" className="mt-14 rounded-[3px] bg-mist p-6 sm:p-8">
        <h2 id="next-h" className="text-[1.875rem]">
          What to do next
        </h2>
        {sets.length > 0 ? (
          <div className="mt-4 text-[1.0625rem] text-specimen/90">
            <p>Your first-try misses were in {[...new Set(sets.map((x) => sectionShort[x.section as SectionCode]))].join(" and ")}. A free practice set there:</p>
            <ul className="mt-3 space-y-2">
              {sets.map((x) => (
                <li key={x.slug}>
                  <Link href={`/practice/${x.slug}`} className="font-medium text-fixative-ink underline underline-offset-4">
                    {x.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-[1.0625rem] text-specimen/90">A full practice set is the next step: more questions, in a test-day interface.</p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <SecondaryCta>Try a full free practice set</SecondaryCta>
          <PrimaryCta />
        </div>
      </section>

      {a.mode === "published" && containsAi(s) && <AiNote className="mt-10" />}
    </div>
  );
}
