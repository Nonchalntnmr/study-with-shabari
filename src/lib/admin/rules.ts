// Publishing and role rules, kept pure so they can be tested without a database.

export type ChoiceForCheck = { label: string; text: string; isCorrect: boolean };
export type QuestionForCheck = {
  stem: string;
  explanation: string;
  choices: ChoiceForCheck[];
  passageId?: string | null;
};

const LABELS = ["A", "B", "C", "D"];

/** Returns human-readable problems; an empty array means the question may publish. */
export function questionPublishProblems(q: QuestionForCheck): string[] {
  const problems: string[] = [];
  if (q.stem.trim().length < 5) problems.push("The question stem is empty or too short.");
  if (q.explanation.trim().length < 10) problems.push("Add an explanation before publishing.");

  const labels = q.choices.map((c) => c.label).sort();
  if (labels.join("") !== LABELS.join("")) problems.push("A question needs exactly four choices labelled A, B, C and D.");
  if (q.choices.some((c) => c.text.trim() === "")) problems.push("Every choice needs text.");

  const correct = q.choices.filter((c) => c.isCorrect).length;
  if (correct !== 1) problems.push(correct === 0 ? "Mark one choice as correct." : "Only one choice can be correct.");

  const texts = q.choices.map((c) => c.text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) problems.push("Two choices have identical text.");
  return problems;
}

export type ExamForCheck = {
  items: Array<{ position: number; questionStatus: string }>;
};

export function examPublishProblems(e: ExamForCheck): string[] {
  const problems: string[] = [];
  if (e.items.length === 0) return ["The exam has no questions."];
  const unpublished = e.items.filter((i) => i.questionStatus !== "PUBLISHED").length;
  if (unpublished > 0) problems.push(`${unpublished} question${unpublished === 1 ? " is" : "s are"} not published yet.`);
  const positions = e.items.map((i) => i.position).sort((a, b) => a - b);
  if (positions.some((p, i) => p !== i)) problems.push("Question positions have gaps or repeats.");
  return problems;
}

export function testimonialPublishProblems(t: { consentConfirmed: boolean; quote: string }): string[] {
  const problems: string[] = [];
  if (!t.consentConfirmed) problems.push("Confirm the student's consent before publishing.");
  if (t.quote.trim().length < 10) problems.push("The quote is too short.");
  return problems;
}

export type RoleChangeCheck = { actorId: string; targetId: string; targetRole: string; newRole: string; adminCount: number };

/** Stops an admin locking everyone out: no self-demotion, never zero admins. */
export function roleChangeProblem(c: RoleChangeCheck): string | null {
  if (c.targetRole === c.newRole) return null;
  if (c.actorId === c.targetId && c.newRole !== "ADMIN") return "You can't remove your own admin access.";
  if (c.targetRole === "ADMIN" && c.newRole !== "ADMIN" && c.adminCount <= 1) return "At least one admin must remain.";
  return null;
}
