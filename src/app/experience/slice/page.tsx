import type { Metadata } from "next";
import { BookLink, SecondaryLink } from "@/components/experience/chrome";
import { ScoreBand } from "@/components/experience/slice/score-band";
import { Understanding } from "@/components/experience/slice/understanding";
import { specimenSteps, specimenStills } from "@/components/experience/specimen/specimen-content";
import { SpecimenStory } from "@/components/experience/specimen/specimen-story";
import { SynapseFigure } from "@/components/experience/synapse/synapse-figure";
import { DAT_NOTE, synapseSteps, synapseStills } from "@/components/experience/synapse/synapse-content";
import { SynapseStory } from "@/components/experience/synapse/synapse-story";
import { gateExperience } from "@/lib/experience/gate";
import { paymentNote } from "@/lib/founder-facts";
import { publicQuestions } from "@/lib/lessons/dopamine-page";

// The vertical slice, in the founder's order: Specimen → Synapse → 522 → a question → booking.
// The question is one of Shabari's six (src/lib/lessons/dopamine-page.ts), checked on the server;
// the page receives stems and choices only.

export const instant = false;
export const metadata: Metadata = { title: "Vertical slice", description: "Prototype: the Specimen, the Synapse, the 522, one of Shabari's dopamine questions, and booking." };

/** From her lesson, section 1. */
const LESSON_LINE = "Its amine (pKa ≈ 10) is protonated at physiological pH, so it carries a +1 charge and can’t cross the blood–brain barrier.";

export default function SlicePage() {
  gateExperience();
  const qs = publicQuestions();
  const primary = qs.find((q) => q.id === "q6")!;
  const related = qs.find((q) => q.id === "q2")!;
  return (
    <>
      <SpecimenStory steps={specimenSteps()} stills={specimenStills()} label="The specimen" />
      <SynapseStory
        lazy
        label="At the synapse"
        steps={synapseSteps({ heroLevel: 2, title: "Between two neurons" })}
        stills={synapseStills(false, false)}
        blockedStills={synapseStills(true, false)}
        blockedFigure={<SynapseFigure beat={5} datBlocked title="With DAT blocked, dopamine stays in the cleft and on its receptors" className="w-full" />}
        datNote={DAT_NOTE}
      />
      <ScoreBand />
      <section id="understand" aria-labelledby="understand-h" className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <p className="exp-label-caps text-[color:var(--exp-quiet)]">From her free lesson · question 6 of 6</p>
          <h2 id="understand-h" className="mt-3 max-w-3xl text-[clamp(2rem,3.6vw,3.1rem)] leading-[1.05]">
            Check your understanding
          </h2>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-[color:var(--exp-quiet)]">One of Shabari’s six dopamine questions. Pick an answer to see her explanation.</p>
          <div className="mt-12">
            <Understanding primary={primary} related={related} lessonLine={LESSON_LINE} numbers={[6, 2]} />
          </div>
        </div>
      </section>
      <section aria-labelledby="book-h" className="bg-hema py-20 text-white sm:py-24">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="book-h" className="max-w-2xl text-[clamp(2rem,3.4vw,3rem)] text-white">
              Start with a free consult call.
            </h2>
            <p className="mt-3 text-[1.0625rem] text-white/80">{paymentNote}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <BookLink tone="onDark" />
            <SecondaryLink href="/dopamine" className="text-white decoration-white/40 hover:decoration-white">
              Read the free lesson
            </SecondaryLink>
          </div>
        </div>
      </section>
    </>
  );
}
