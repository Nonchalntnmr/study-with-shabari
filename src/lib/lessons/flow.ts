import type { LessonSnapshot, SnapshotChoice, SnapshotQuestion, SnapshotStep } from "./snapshot";

// The learning loop as pure functions over a snapshot and the answers given:
// teach → test (confidence before reveal) → explain → diagnose → reinforce → retest → result.
// Nothing here infers beyond what was answered: no mastery levels, no predictions.

export type ConfidenceLevel = "SURE" | "UNSURE" | "GUESSING";
export type GivenAnswer = { stepPosition: number; choiceLabel: string; confidence: ConfidenceLevel; isCorrect: boolean; misconceptionId: string | null };

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = { SURE: "Sure", UNSURE: "Unsure", GUESSING: "Guessing" };

export const isQuestionStep = (s: SnapshotStep) => s.kind === "TEST" || s.kind === "RETEST";

// ------------------------------------------------------------------ navigation

/**
 * The furthest step a student may open: the first question not yet answered.
 * Returns `steps.length` once every question is answered (the result screen).
 */
export function furthestStep(s: LessonSnapshot, answered: ReadonlySet<number>): number {
  const next = s.steps.find((st) => isQuestionStep(st) && !answered.has(st.position));
  return next ? next.position : s.steps.length;
}

/** Where to pick up: the step after the last answered question, or the start. */
export function resumeStep(s: LessonSnapshot, answered: ReadonlySet<number>): number {
  const last = Math.max(-1, ...answered);
  return Math.min(last + 1, furthestStep(s, answered));
}

/** Clamps a requested step to what the student has unlocked; no request means resume. */
export function resolveStep(s: LessonSnapshot, answered: ReadonlySet<number>, requested: number | null): number {
  if (requested === null || !Number.isInteger(requested) || requested < 0) return resumeStep(s, answered);
  return Math.min(requested, furthestStep(s, answered));
}

export type Progress = { step: number; of: number; questionsAnswered: number; questions: number };

export function progress(s: LessonSnapshot, position: number, answered: ReadonlySet<number>): Progress {
  const questions = s.steps.filter(isQuestionStep);
  return { step: Math.min(position + 1, s.steps.length), of: s.steps.length, questionsAnswered: questions.filter((q) => answered.has(q.position)).length, questions: questions.length };
}

// ------------------------------------------------------------------ grading and reveal

export type Grade = { isCorrect: boolean; misconceptionId: string | null };

export function grade(s: LessonSnapshot, q: SnapshotQuestion, choiceLabel: string): Grade | null {
  const choice = q.choices.find((c) => c.label === choiceLabel);
  if (!choice) return null;
  const m = choice.misconception ? s.misconceptions[choice.misconception] : undefined;
  return { isCorrect: choice.isCorrect, misconceptionId: choice.isCorrect ? null : (m?.id ?? null) };
}

export type Reveal = {
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  chosen: SnapshotChoice;
  correct: SnapshotChoice;
  /** The wrong choices the student didn't pick, each with its rationale. */
  others: SnapshotChoice[];
  explanation: string;
  misconception: { name: string; description: string } | null;
  /** Sure and wrong, or right while guessing: the feedback worth pausing on. */
  calibration: "sure-wrong" | "unsure-right" | null;
};

export function reveal(s: LessonSnapshot, q: SnapshotQuestion, answer: Pick<GivenAnswer, "choiceLabel" | "confidence">): Reveal | null {
  const chosen = q.choices.find((c) => c.label === answer.choiceLabel);
  const correct = q.choices.find((c) => c.isCorrect);
  if (!chosen || !correct) return null;
  const m = !chosen.isCorrect && chosen.misconception ? s.misconceptions[chosen.misconception] : undefined;
  return {
    isCorrect: chosen.isCorrect,
    confidence: answer.confidence,
    chosen,
    correct,
    others: q.choices.filter((c) => !c.isCorrect && c.label !== chosen.label),
    explanation: q.explanation,
    misconception: m ? { name: m.name, description: m.description } : null,
    calibration: calibration(chosen.isCorrect, answer.confidence),
  };
}

function calibration(isCorrect: boolean, confidence: ConfidenceLevel): Reveal["calibration"] {
  if (!isCorrect && confidence === "SURE") return "sure-wrong";
  if (isCorrect && confidence !== "SURE") return "unsure-right";
  return null;
}

// ------------------------------------------------------------------ remediation

/** The test a remediation or retest step follows up on: the latest earlier TEST on the same concept. */
export function testFor(s: LessonSnapshot, step: SnapshotStep): SnapshotStep | null {
  const earlier = s.steps.filter((t) => t.kind === "TEST" && t.concept === step.concept && t.position < step.position);
  return earlier.at(-1) ?? null;
}

export type Remediation =
  | { kind: "misconception"; name: string; remediation: string; rule: string | null }
  | { kind: "missed"; explanation: string; rule: string | null }
  | { kind: "reinforce"; unsure: boolean; rule: string | null };

/** Targeted re-teaching keyed to what the student actually chose on the test. */
export function remediationFor(s: LessonSnapshot, step: SnapshotStep, answers: GivenAnswer[]): Remediation | null {
  const test = testFor(s, step);
  const answer = test && answers.find((a) => a.stepPosition === test.position);
  if (!test?.question || !answer) return null;
  const rule = step.body;
  if (answer.isCorrect) return { kind: "reinforce", unsure: answer.confidence !== "SURE", rule };
  const m = Object.values(s.misconceptions).find((x) => x.id === answer.misconceptionId);
  if (m) return { kind: "misconception", name: m.name, remediation: m.remediation, rule };
  return { kind: "missed", explanation: test.question.explanation, rule };
}

// ------------------------------------------------------------------ result

export type AnswerSummary = { label: string; text: string; isCorrect: boolean; confidence: ConfidenceLevel; misconception: string | null };
export type ConceptResult = { concept: string; label: string; section: string; first: AnswerSummary | null; retest: AnswerSummary | null };
export type LessonResult = {
  complete: boolean;
  answered: number;
  questions: number;
  concepts: ConceptResult[];
  misconceptions: { name: string; concept: string }[];
  sureWrong: string[];
  unsureRight: string[];
  /** Sections where a first answer was wrong, for the next-step suggestion. */
  missedSections: string[];
};

/** A readable name for a concept: its teach step's title, else the passage title, else the slug. */
export function conceptLabel(s: LessonSnapshot, concept: string): string {
  const teach = s.steps.find((st) => st.kind === "TEACH" && st.concept === concept && st.title);
  if (teach?.title) return teach.title.replace(/^[^:]+:\s*/, "");
  const passage = s.steps.find((st) => st.concept === concept && st.question?.passage)?.question?.passage;
  return passage?.title ?? concept.replace(/-/g, " ");
}

export function lessonResult(s: LessonSnapshot, answers: GivenAnswer[]): LessonResult {
  const byPosition = new Map(answers.map((a) => [a.stepPosition, a]));
  const byId = new Map(Object.values(s.misconceptions).map((m) => [m.id, m]));

  const summarize = (st: SnapshotStep | undefined): AnswerSummary | null => {
    const a = st && byPosition.get(st.position);
    const c = a && st.question?.choices.find((x) => x.label === a.choiceLabel);
    if (!a || !c) return null;
    return { label: a.choiceLabel, text: c.text, isCorrect: a.isCorrect, confidence: a.confidence, misconception: (a.misconceptionId && byId.get(a.misconceptionId)?.name) || null };
  };

  const tests = s.steps.filter((st) => st.kind === "TEST");
  const concepts = tests.map((t) => {
    const retest = s.steps.find((st) => st.kind === "RETEST" && st.concept === t.concept && st.position > t.position);
    return { concept: t.concept, label: conceptLabel(s, t.concept), section: t.question?.section ?? "", first: summarize(t), retest: summarize(retest) };
  });

  const questionSteps = s.steps.filter(isQuestionStep);
  const misconceptions: LessonResult["misconceptions"] = [];
  const sureWrong: string[] = [];
  const unsureRight: string[] = [];
  for (const st of questionSteps) {
    const a = byPosition.get(st.position);
    if (!a) continue;
    const label = conceptLabel(s, st.concept);
    const m = a.misconceptionId ? byId.get(a.misconceptionId) : undefined;
    if (m && !misconceptions.some((x) => x.name === m.name)) misconceptions.push({ name: m.name, concept: label });
    const cal = calibration(a.isCorrect, a.confidence);
    const where = `${label}${st.kind === "RETEST" ? " (retest)" : ""}`;
    if (cal === "sure-wrong") sureWrong.push(where);
    if (cal === "unsure-right") unsureRight.push(where);
  }

  const answered = questionSteps.filter((st) => byPosition.has(st.position)).length;
  return {
    complete: answered === questionSteps.length,
    answered,
    questions: questionSteps.length,
    concepts,
    misconceptions,
    sureWrong,
    unsureRight,
    missedSections: [...new Set(concepts.filter((c) => c.first && !c.first.isCorrect).map((c) => c.section))],
  };
}
