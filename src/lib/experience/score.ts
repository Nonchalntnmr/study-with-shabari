import { mcatScore } from "@/lib/founder-facts";

// How the prototypes show the MCAT score. One place, so a founder decision is a one-line change.
//
// Coordinator's founder decisions (2026-10-30 05:50) for these prototypes: the 522 only, no
// section scores, never "verified", and "as reported". docs/FOUNDER-APPROVAL.md in the main
// checkout was later updated (06:05) to say she approved the section scores and that the score is
// stated plainly; that conflict is listed in docs/EXPERIENCE.md for the coordinator to settle.

export const SHOW_SECTION_SCORES = false;
export const SCORE = mcatScore.total;
export const SCORE_TAKEN = mcatScore.taken;
export const SCORE_QUALIFIER = "as reported";
/** The MCAT total's scale: a fact about the exam, already on the live site's score instrument. */
export const SCALE = { min: 472, max: 528, line: "Totals run from 472 to 528." };
