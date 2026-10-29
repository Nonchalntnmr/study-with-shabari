// Publishing and role rules, kept pure so they can be tested without a database.

export type ChoiceForCheck = { label: string; text: string; isCorrect: boolean; misconceptionId?: string | null; rationale?: string | null };
export type QuestionForCheck = {
  stem: string;
  explanation: string;
  choices: ChoiceForCheck[];
  passageId?: string | null;
  /** Omitted for legacy callers: treated as human-written. */
  authoredBy?: "HUMAN" | "AI";
  reviewedById?: string | null;
  /** Omitted by callers that check topics elsewhere. */
  topicCount?: number;
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

  // Every choice explains itself: why the answer is right and why each distractor is wrong.
  if (q.choices.some((c) => c.rationale !== undefined && !c.rationale?.trim())) problems.push("Write a rationale for every choice, including why each wrong answer is wrong.");
  if (q.topicCount !== undefined && q.topicCount === 0) problems.push("Tag at least one topic.");

  const texts = q.choices.map((c) => c.text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) problems.push("Two choices have identical text.");
  // AI-drafted questions need a recorded human review before they can go live, whatever route publishes them.
  if (q.authoredBy === "AI" && !q.reviewedById) problems.push("This question was drafted by AI and needs an admin's review approval first.");
  return problems;
}

// ------------------------------------------------------------------ approval and lessons

export type ApprovalCheck = { approverRole: string | null; authoredBy: "HUMAN" | "AI"; attestedReview: boolean };

/** Publishing is a human decision: only admins approve, and AI drafts need an explicit review attestation. */
export function approvalProblem(c: ApprovalCheck): string | null {
  if (c.approverRole !== "ADMIN") return "Only an admin can approve content for publishing.";
  if (c.authoredBy === "AI" && !c.attestedReview) return "This lesson contains AI-drafted content. Confirm you have reviewed every step before publishing.";
  return null;
}

export type LessonStepForCheck = {
  position: number;
  kind: "TEACH" | "TEST" | "REMEDIATE" | "RETEST";
  concept: string;
  body?: string | null;
  questionId?: string | null;
  question?: QuestionForCheck | null;
};
export type LessonForCheck = { title: string; objectives: string[]; steps: LessonStepForCheck[] };

/**
 * A lesson can publish when it teaches, tests and retests coherently. `reviewed`
 * reflects the approval the publish action is about to record, so AI-drafted
 * questions inside it pass once an admin has attested to reviewing them.
 */
export function lessonPublishProblems(l: LessonForCheck, reviewed: boolean): string[] {
  const problems: string[] = [];
  if (l.title.trim().length < 3) problems.push("Give the lesson a title.");
  if (l.objectives.filter((o) => o.trim()).length === 0) problems.push("List at least one learning objective.");
  const steps = [...l.steps].sort((a, b) => a.position - b.position);
  if (steps.length === 0) return [...problems, "The lesson has no steps."];
  if (steps.some((s, i) => s.position !== i)) problems.push("Step positions have gaps or repeats.");

  for (const s of steps) {
    const label = `Step ${s.position + 1}`;
    if (s.kind === "TEACH" && !s.body?.trim()) problems.push(`${label} (teach) has no content.`);
    if (s.kind === "TEST" || s.kind === "RETEST") {
      if (!s.question) {
        problems.push(`${label} (${s.kind.toLowerCase()}) has no question.`);
        continue;
      }
      const qProblems = questionPublishProblems({ ...s.question, reviewedById: s.question.reviewedById ?? (reviewed ? "pending-approval" : null) });
      for (const qp of qProblems) problems.push(`${label}: ${qp}`);
    }
  }
  const tests = steps.filter((s) => s.kind === "TEST");
  for (const t of tests) {
    const retest = steps.find((s) => s.kind === "RETEST" && s.concept === t.concept && s.position > t.position);
    const isPassage = Boolean(t.question?.passageId);
    if (!retest && !isPassage) problems.push(`The test on “${t.concept}” has no retest on the same concept.`);
    if (retest && retest.questionId && retest.questionId === t.questionId) problems.push(`The retest on “${t.concept}” must use a different question.`);
    const wrong = t.question?.choices.filter((c) => !c.isCorrect) ?? [];
    if (wrong.length > 0 && wrong.every((c) => !c.misconceptionId)) problems.push(`The test on “${t.concept}” maps no wrong answer to a misconception.`);
  }
  for (const r of steps.filter((s) => s.kind === "REMEDIATE")) {
    if (!tests.some((t) => t.concept === r.concept && t.position < r.position)) problems.push(`Step ${r.position + 1} remediates “${r.concept}” before it is tested.`);
  }
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
