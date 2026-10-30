import { mcatScore } from "@/lib/founder-facts";

// How the MCAT score is shown in the cinematic acts. One place, so a founder decision is a one-line
// change.
//
// Founder decision 2026-10-30 07:24 (docs/FOUNDER-SPEC.md 05:56 answers; the coordinator's Stage 1
// brief): the 522 and the three section scores she confirmed, stated plainly, with no "as reported"
// or "Shabari reports" hedge. Those three sections only: CARS is never derived or shown. No
// percentiles, outcomes or guarantees.

export const SCORE = mcatScore.total;
export const SCORE_TAKEN = mcatScore.taken;
/** In the order the coordinator listed them (the AAMC's order, without CARS). */
export const SECTIONS = [
  { code: "CP", label: "C/P", value: mcatScore.sections.CP },
  { code: "BB", label: "B/B", value: mcatScore.sections.BB },
  { code: "PS", label: "P/S", value: mcatScore.sections.PS },
] as const;
/** The exam's scales: facts about the MCAT, already on the live site's score instrument. */
export const SCALE = { min: 472, max: 528, line: "Totals run from 472 to 528." };
export const SECTION_SCALE = { min: 118, max: 132, line: "Each section from 118 to 132." };
/** What a screen reader hears for the big number. */
export const SCORE_TEXT = `MCAT ${SCORE}`;
