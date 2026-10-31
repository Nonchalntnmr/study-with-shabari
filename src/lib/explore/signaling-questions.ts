import "server-only";

// The knowledge check on /explore/signaling: three MCAT-style questions, written for this page and
// logged for Shabari in docs/STAGE-TEXT-FOR-SHABARI.md. As with her dopamine lesson
// (src/lib/lessons/dopamine-page.ts), the answers and explanations stay on the server: the page gets
// stems and choices only, and checkSignalingAnswer reveals one explanation per answer.

type Question = { id: string; stem: string; choices: [string, string, string, string]; answer: 0 | 1 | 2 | 3; explanation: string };

export const SIGNALING_QUESTIONS: Question[] = [
  {
    id: "threshold",
    stem: "A stimulus depolarizes a resting neuron from −70 mV to −60 mV. If threshold is −55 mV, what happens?",
    choices: ["A smaller action potential fires", "A full-size action potential fires", "No action potential fires", "The neuron fires a burst of action potentials"],
    answer: 2,
    explanation: "Action potentials are all-or-none. Below threshold, too few voltage-gated Na⁺ channels open, and the small depolarization fades.",
  },
  {
    id: "refractory",
    stem: "A second stimulus arrives while the neuron’s voltage-gated Na⁺ channels are inactivated. The second stimulus:",
    choices: ["fires an action potential if it is strong enough", "cannot fire an action potential", "fires a larger action potential", "hyperpolarizes the membrane"],
    answer: 1,
    explanation: "This is the absolute refractory period. Inactivated Na⁺ channels can’t open again until the membrane repolarizes, so no stimulus can fire another action potential.",
  },
  {
    id: "calcium",
    stem: "A toxin blocks voltage-gated Ca²⁺ channels in the axon terminal. Which step is directly prevented?",
    choices: ["Depolarization of the axon by Na⁺ entry", "Reuptake of neurotransmitter", "Binding of neurotransmitter to its receptors", "Vesicle fusion and neurotransmitter release"],
    answer: 3,
    explanation: "Ca²⁺ entering the terminal triggers vesicles to fuse with the membrane. Without it, the action potential still arrives, but no neurotransmitter is released.",
  },
];

export type PublicQuestion = { id: string; stem: string; choices: string[] };

/** What the page may show before anyone answers. */
export function publicSignalingQuestions(): PublicQuestion[] {
  return SIGNALING_QUESTIONS.map(({ id, stem, choices }) => ({ id, stem, choices: [...choices] }));
}

export type AnswerResult = { correct: boolean; answer: number; explanation: string } | { error: string };

export function checkSignaling(id: unknown, choice: unknown): AnswerResult {
  const q = SIGNALING_QUESTIONS.find((x) => x.id === id);
  if (!q || typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice > 3) return { error: "That question isn’t part of this explorer." };
  return { correct: choice === q.answer, answer: q.answer, explanation: q.explanation };
}
