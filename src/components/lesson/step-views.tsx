import Link from "next/link";
import { CONFIDENCE_LABEL, type Remediation, type Reveal } from "@/lib/lessons/flow";
import type { SnapshotQuestion, SnapshotStep } from "@/lib/lessons/snapshot";
import { sectionShort, type SectionCode } from "@/lib/site";
import { LessonFigure } from "./figure";
import { FocusOnMount } from "./focus-on-mount";
import { Paragraphs } from "./paragraphs";

const HEADING = "step-heading";

export function ContinueLink({ href, children = "Continue" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-12 items-center rounded-full bg-eosin px-7 text-[1rem] font-semibold text-specimen transition-colors hover:bg-[#E46C91]">
      {children}
    </Link>
  );
}

function StepHeading({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <header>
      <FocusOnMount id={HEADING} />
      {kicker && <p className="text-[0.98rem] text-quiet">{kicker}</p>}
      <h1 id={HEADING} tabIndex={-1} className="mt-2 text-[clamp(2rem,6vw,3.25rem)] outline-none">
        {children}
      </h1>
    </header>
  );
}

// ------------------------------------------------------------------ teach

export function TeachView({ step, next }: { step: SnapshotStep; next: string }) {
  const [kicker, title] = step.title?.includes(":") ? step.title.split(/:\s*/, 2) : [undefined, step.title ?? "Read this first"];
  return (
    <article className="space-y-8">
      <StepHeading kicker={kicker}>{title}</StepHeading>
      <Paragraphs text={step.body ?? ""} className="max-w-[62ch] space-y-4 text-[1.125rem] leading-relaxed text-specimen/90" />
      <LessonFigure name={step.figure} />
      <ContinueLink href={next} />
    </article>
  );
}

// ------------------------------------------------------------------ questions

export function QuestionHeader({ step, number, of }: { step: SnapshotStep; number: number; of: number }) {
  const q = step.question!;
  const section = sectionShort[q.section as SectionCode] ?? q.section;
  return (
    <StepHeading kicker={step.kind === "RETEST" ? `${section} retest: the same idea, a new question` : section}>
      Question {number} of {of}
    </StepHeading>
  );
}

export function PassageBlock({ q }: { q: SnapshotQuestion }) {
  if (!q.passage) return null;
  return (
    <section aria-labelledby="passage-h" className="mt-8 rounded-[3px] bg-[#F6F8F7] p-5 sm:p-7">
      <h2 id="passage-h" className="font-body text-[1.0625rem] font-semibold text-specimen">
        Passage: {q.passage.title}
      </h2>
      <Paragraphs text={q.passage.body} className="mt-3 max-w-[66ch] space-y-3 text-[1.0625rem] leading-relaxed text-specimen/90" />
    </section>
  );
}

export function Stem({ q }: { q: SnapshotQuestion }) {
  return <p className="mt-8 max-w-[62ch] text-[1.1875rem] leading-relaxed text-specimen">{q.stem}</p>;
}

/** The choices after answering: the student's pick and the right answer, marked in words as well as colour. */
export function AnsweredChoices({ q, chosen }: { q: SnapshotQuestion; chosen: string }) {
  return (
    <ul aria-label="Answer choices" className="mt-8 grid gap-2.5">
      {q.choices.map((c) => {
        const mine = c.label === chosen;
        const tone = c.isCorrect ? "bg-white ring-2 ring-fixative" : mine ? "bg-white ring-2 ring-[#A3304F]" : "bg-[#F6F8F7] ring-1 ring-hairline";
        return (
          <li key={c.label} className={`flex gap-4 rounded-[3px] px-4 py-3.5 ${tone}`}>
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold text-hema ring-1 ring-hema/40">
              {c.label}
            </span>
            <span className="pt-0.5 text-[1.0625rem] leading-snug text-specimen">
              <span className="sr-only">{c.label}. </span>
              {c.text}
              {(c.isCorrect || mine) && (
                <span className={`mt-1 block text-sm font-semibold ${c.isCorrect ? "text-fixative-ink" : "text-[#A3304F]"}`}>
                  {c.isCorrect && mine ? "Your answer, correct" : c.isCorrect ? "Correct answer" : "Your answer"}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RevealView({ r, next, nextLabel }: { r: Reveal; next: string; nextLabel: string }) {
  return (
    <section id="reveal" aria-labelledby="reveal-h" data-testid="reveal" className="mt-10 scroll-mt-24 space-y-7 border-t border-hairline pt-8">
      <FocusOnMount id="reveal-h" scroll />
      <div>
        <h2 id="reveal-h" tabIndex={-1} className="scroll-mt-24 text-[2rem] outline-none" data-testid="reveal-verdict">
          {r.isCorrect ? "Correct." : "Not quite."}
        </h2>
        <p className="mt-2 text-[1.0625rem] text-specimen/85">
          You chose {r.chosen.label} and said you were {CONFIDENCE_LABEL[r.confidence].toLowerCase()}.
          {!r.isCorrect && ` The answer is ${r.correct.label}.`}
        </p>
      </div>

      {r.calibration === "sure-wrong" && (
        <p className="rounded-[3px] bg-[#FBE9EE] px-4 py-3 text-[1.0625rem] text-specimen">
          You were sure, and it was wrong. That’s the most useful kind of miss: it points at a rule that needs fixing, not just a gap.
        </p>
      )}
      {r.calibration === "unsure-right" && (
        <p className="rounded-[3px] bg-[#E3F1F0] px-4 py-3 text-[1.0625rem] text-specimen">
          Right, but you weren’t sure. Read the reasoning below so the next one feels certain.
        </p>
      )}

      {!r.isCorrect && (
        <div className="space-y-3">
          <h3 className="text-[1.375rem]">Why {r.chosen.label} is wrong</h3>
          {r.chosen.rationale && <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-specimen/90">{r.chosen.rationale}</p>}
          {r.misconception && (
            <div className="rounded-[3px] bg-[#F6F8F7] p-5 ring-1 ring-hairline" data-testid="misconception">
              <p className="text-sm text-quiet">The misconception behind this answer</p>
              <p className="mt-1 text-[1.125rem] font-semibold text-hema" data-testid="misconception-name">
                {r.misconception.name}
              </p>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-specimen/90">{r.misconception.description}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[1.375rem]">Why {r.correct.label} is right</h3>
        {r.correct.rationale && <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-specimen/90">{r.correct.rationale}</p>}
        <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-specimen/90">{r.explanation}</p>
      </div>

      {r.others.length > 0 && (
        <details className="group rounded-[3px] bg-[#F6F8F7] px-5 py-4 ring-1 ring-hairline">
          <summary className="cursor-pointer text-[1.0625rem] font-medium text-hema">Why the other choices are wrong</summary>
          <ul className="mt-4 space-y-3">
            {r.others.map((c) => (
              <li key={c.label} className="text-[1.0625rem] leading-relaxed text-specimen/90">
                <span className="font-semibold">{c.label}. </span>
                {c.rationale ?? "No rationale written for this choice yet."}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ContinueLink href={next}>{nextLabel}</ContinueLink>
    </section>
  );
}

// ------------------------------------------------------------------ remediate

export function RemediateView({ rem, next, nextLabel }: { rem: Remediation | null; next: string; nextLabel: string }) {
  const rule = rem?.rule;
  return (
    <article className="space-y-8" data-testid="remediation">
      {rem?.kind === "misconception" ? (
        <>
          <StepHeading kicker="Fix the idea behind your answer">{rem.name}</StepHeading>
          <p className="max-w-[62ch] text-[1.125rem] leading-relaxed text-specimen/90" data-testid="remediation-text">
            {rem.remediation}
          </p>
        </>
      ) : rem?.kind === "missed" ? (
        <>
          <StepHeading kicker="Before the retest">One more look</StepHeading>
          <p className="max-w-[62ch] text-[1.125rem] leading-relaxed text-specimen/90">{rem.explanation}</p>
        </>
      ) : (
        <StepHeading kicker="Before the retest">{rem?.kind === "reinforce" && rem.unsure ? "You got it. Now make it certain." : "You had this one."}</StepHeading>
      )}
      {rule && (
        <div className="rounded-[3px] bg-[#F6F8F7] p-5 ring-1 ring-hairline">
          <p className="text-sm text-quiet">The rule to keep</p>
          <p className="mt-1 max-w-[62ch] text-[1.125rem] leading-relaxed text-specimen">{rule}</p>
        </div>
      )}
      <ContinueLink href={next}>{nextLabel}</ContinueLink>
    </article>
  );
}
