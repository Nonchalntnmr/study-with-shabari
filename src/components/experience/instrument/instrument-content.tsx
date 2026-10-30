import { bio, mcatTutoring, paymentNote } from "@/lib/founder-facts";
import { SCALE, SCORE, SCORE_TAKEN, SCORE_TEXT, SECTIONS, SECTION_SCALE } from "@/lib/experience/score";
import { BookLink, SecondaryLink } from "../chrome";
import { Panel, type StepContent } from "../scroll-story";
import type { InstrumentWords } from "./instrument-stage";

// The 522 reveal's words, all from src/lib/founder-facts.ts and src/lib/experience/score.ts: the
// score and her three section scores stated plainly, the exam's scales (already on the live site),
// her bio line and her tutoring points.

/** "…so I try to make things clear, simple, and built around you." → the three phrases, as she wrote them. */
const APPROACH = bio.slice(bio.indexOf("I remember"));
const PHRASES = ["clear", "simple", "built around you"].filter((p) => APPROACH.includes(p));
const POINTS = ["1:1 live sessions on Zoom", "A study plan built around your test date", "Focus on C/P, B/B, and P/S"].filter((p) => mcatTutoring.points.includes(p));

export const instrumentWords: InstrumentWords = {
  score: SCORE,
  taken: SCORE_TAKEN,
  scale: { min: SCALE.min, max: SCALE.max },
  sections: SECTIONS.map((s) => ({ label: s.label, value: s.value })),
  sectionScale: { min: SECTION_SCALE.min, max: SECTION_SCALE.max },
  phrases: PHRASES.map((p) => p[0].toUpperCase() + p.slice(1) + "."),
  points: POINTS,
};

/** The still forms, for reduced motion: the final numbers, no animation. */
function ScoreStill() {
  return (
    <div>
      <p aria-hidden className="font-display text-[clamp(5rem,20vw,9rem)] leading-none tracking-[-0.04em] text-hema">
        {SCORE}
      </p>
      <p className="mt-3 text-[1.0625rem] text-specimen/90">
        {SCORE} on a scale of {SCALE.min} to {SCALE.max}, {SCORE_TAKEN}.
      </p>
    </div>
  );
}
function SectionsStill() {
  return (
    <ul aria-hidden className="grid max-w-md grid-cols-3 gap-6">
      {SECTIONS.map((s) => (
        <li key={s.code}>
          <span className="block font-display text-[3rem] leading-none text-hema">{s.value}</span>
          <span className="mt-1 block text-[0.95rem] font-semibold text-[color:var(--exp-quiet)]">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The reveal's beats. On the home page it is one act among five: `book` is false there, because
 * booking follows the learning act. `heroLevel` is 1 where the reveal opens a page.
 */
export function instrumentSteps({ heroLevel = 1 as 1 | 2, book = true, headline = true } = {}): StepContent[] {
  const steps: StepContent[] = [
    {
      id: "score",
      nav: "the score",
      panel: (
        <Panel kicker={`MCAT · ${SCORE_TAKEN}`} title={headline ? mcatTutoring.headline : SCORE_TEXT} level={heroLevel} titleClass={headline ? "text-[clamp(2rem,3vw,2.75rem)] leading-[1.06]" : undefined}>
          {headline && <p className="font-semibold text-hema">{SCORE_TEXT}</p>}
          <p>{SCALE.line}</p>
          {headline && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <BookLink />
              <SecondaryLink href="/mcat">Explore MCAT tutoring</SecondaryLink>
            </div>
          )}
        </Panel>
      ),
      figure: <ScoreStill />,
    },
    {
      id: "sections",
      nav: "the section scores",
      panel: (
        <Panel kicker={`MCAT · ${SCORE_TAKEN}`} title="Section scores">
          <ul className="grid gap-1">
            {SECTIONS.map((s) => (
              <li key={s.code}>
                {s.label}: {s.value}
              </li>
            ))}
          </ul>
          <p className="text-[0.95rem] text-[color:var(--exp-quiet)]">{SECTION_SCALE.line}</p>
        </Panel>
      ),
      figure: <SectionsStill />,
    },
    {
      id: "approach",
      nav: "how she teaches",
      panel: (
        <Panel kicker="In her words" title="Clear, simple, built around you">
          <p>“{APPROACH}”</p>
        </Panel>
      ),
    },
    {
      id: "sessions",
      nav: "what sessions look like",
      panel: (
        <Panel kicker="MCAT tutoring" title="One-on-one">
          <ul className="grid gap-2">
            {POINTS.map((p) => (
              <li key={p} className="border-b border-[color:var(--exp-rule)] pb-2">
                {p}
              </li>
            ))}
          </ul>
        </Panel>
      ),
    },
  ];
  if (book)
    steps.push({
      id: "book",
      nav: "book a call",
      panel: (
        <Panel kicker="Free consult call" title="Start with a free consult call.">
          <p className="text-[0.98rem] text-[color:var(--exp-quiet)]">{paymentNote}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <BookLink />
            <SecondaryLink href="/mcat">Explore MCAT tutoring</SecondaryLink>
          </div>
        </Panel>
      ),
    });
  return steps;
}
