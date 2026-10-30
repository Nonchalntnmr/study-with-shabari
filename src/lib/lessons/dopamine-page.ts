import "server-only";

// "Dopamine: One Molecule, Every MCAT Section": Shabari's free lesson, written by her (founder update,
// 2026-10-30, docs/FOUNDER-SPEC.md section 5). The answers and explanations stay on the server: the
// page gets stems and choices only, and checkDopamineAnswer reveals one explanation per answer.

type Question = { id: string; stem: string; choices: [string, string, string, string]; answer: 0 | 1 | 2 | 3; explanation: string };

const QUESTIONS: Question[] = [
  {
    id: "q1",
    stem: "The rate-limiting enzyme in dopamine synthesis is:",
    choices: ["DOPA decarboxylase", "tyrosine hydroxylase", "dopamine β-hydroxylase", "PNMT"],
    answer: 1,
    explanation: "Tyrosine hydroxylase converts tyrosine to L-DOPA and controls the pathway's overall rate.",
  },
  {
    id: "q2",
    stem: "Parkinson's patients are given L-DOPA instead of dopamine because:",
    choices: ["dopamine is toxic", "L-DOPA binds D2 receptors directly", "dopamine cannot cross the blood–brain barrier", "L-DOPA lasts longer in plasma"],
    answer: 2,
    explanation: "Charged dopamine can't cross; L-DOPA enters through amino acid transporters and is converted in the brain.",
  },
  {
    id: "q3",
    stem: "A patient on a D2-blocking antipsychotic develops breast milk production. Which pathway explains this?",
    choices: ["Nigrostriatal", "Mesolimbic", "Mesocortical", "Tuberoinfundibular"],
    answer: 3,
    explanation: "Dopamine normally inhibits prolactin; blocking it raises prolactin.",
  },
  {
    id: "q4",
    stem: "Cocaine increases synaptic dopamine by:",
    choices: ["inhibiting MAO", "blocking the dopamine transporter", "stimulating tyrosine hydroxylase", "activating D1 receptors"],
    answer: 1,
    explanation: "Blocking DAT prevents reuptake, so dopamine stays in the synapse longer.",
  },
  {
    id: "q5",
    stem: "A monkey has learned that a light always predicts juice. When the juice arrives as expected, dopamine neurons:",
    choices: ["fire strongly at the juice", "fire at the light, not the juice", "fire at neither", "dip below baseline at the light"],
    answer: 1,
    explanation: "Once a reward is fully predicted, the dopamine burst moves to the cue.",
  },
  {
    id: "q6",
    stem: "At pH 7.4, dopamine's net charge is approximately:",
    choices: ["−1", "0", "+1", "+2"],
    answer: 2,
    explanation: "The amine (pKa ≈ 10) is protonated; the catechol –OH groups (pKa ≈ 9–10+) are mostly neutral.",
  },
];

export type PublicQuestion = { id: string; stem: string; choices: string[] };

/** What the page may show before anyone answers. */
export function publicQuestions(): PublicQuestion[] {
  return QUESTIONS.map(({ id, stem, choices }) => ({ id, stem, choices: [...choices] }));
}

export type AnswerResult = { correct: boolean; answer: number; explanation: string } | { error: string };

export function checkAnswer(id: unknown, choice: unknown): AnswerResult {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q || typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice > 3) return { error: "That question isn't part of this lesson." };
  return { correct: choice === q.answer, answer: q.answer, explanation: q.explanation };
}
