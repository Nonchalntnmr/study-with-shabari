import { bio, mcatTutoring, paymentNote } from "@/lib/founder-facts";
import { SCALE, SCORE, SCORE_QUALIFIER, SCORE_TAKEN } from "@/lib/experience/score";
import { BookLink, SecondaryLink } from "../chrome";
import { Panel, type StepContent } from "../scroll-story";
import type { InstrumentWords } from "./instrument-stage";

// The Instrument's words, all from src/lib/founder-facts.ts. The score is the 522 only (see
// src/lib/experience/score.ts); the scale line is a fact about the exam.

/** "…so I try to make things clear, simple, and built around you." → the three phrases, as she wrote them. */
const APPROACH = bio.slice(bio.indexOf("I remember"));
const PHRASES = ["clear", "simple", "built around you"].filter((p) => APPROACH.includes(p));
const POINTS = ["1:1 live sessions on Zoom", "A study plan built around your test date", "Focus on C/P, B/B, and P/S"].filter((p) => mcatTutoring.points.includes(p));

export const instrumentWords: InstrumentWords = {
  score: SCORE,
  qualifier: SCORE_QUALIFIER,
  taken: SCORE_TAKEN,
  scale: { min: SCALE.min, max: SCALE.max },
  phrases: PHRASES.map((p) => p[0].toUpperCase() + p.slice(1) + "."),
  points: POINTS,
};

function Big({ children }: { children: React.ReactNode }) {
  return <p className="font-display text-[clamp(5rem,20vw,9rem)] leading-none tracking-[-0.04em] text-hema">{children}</p>;
}

export function instrumentSteps({ heroLevel = 1 as 1 | 2 } = {}): StepContent[] {
  return [
    {
      id: "score",
      nav: "the score",
      panel: (
        <Panel kicker="Instrument" title={mcatTutoring.headline} level={heroLevel} titleClass="text-[clamp(2rem,3vw,2.75rem)] leading-[1.06]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <BookLink />
            <SecondaryLink href="/mcat">Explore MCAT tutoring</SecondaryLink>
          </div>
        </Panel>
      ),
      figure: (
        <div>
          <Big>{SCORE}</Big>
          <p className="exp-label-caps mt-2 text-[color:var(--exp-quiet)]">
            MCAT · {SCORE_TAKEN} · {SCORE_QUALIFIER}
          </p>
        </div>
      ),
    },
    {
      id: "scale",
      nav: "the scale",
      panel: (
        <Panel kicker={`MCAT · ${SCORE_TAKEN} · ${SCORE_QUALIFIER}`} title={`${SCORE}, on the scale`}>
          <p>{SCALE.line}</p>
        </Panel>
      ),
      figure: (
        <p className="text-[1.0625rem] text-specimen/90">
          {SCORE} on a scale of {SCALE.min} to {SCALE.max}.
        </p>
      ),
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
    {
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
    },
  ];
}
