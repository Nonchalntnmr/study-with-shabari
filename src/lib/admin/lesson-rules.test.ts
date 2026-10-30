import { describe, expect, it } from "vitest";
import { approvalProblem, lessonPublishProblems, questionPublishProblems, type LessonForCheck } from "./rules";

const q = (over: Partial<Parameters<typeof questionPublishProblems>[0]> = {}) => ({
  stem: "At pH 7.4, which form of the amine predominates?",
  explanation: "pKa is above pH, so the protonated form predominates.",
  choices: [
    { label: "A", text: "Neutral", isCorrect: false, misconceptionId: "m1" },
    { label: "B", text: "Protonated", isCorrect: true },
    { label: "C", text: "Equal amounts", isCorrect: false },
    { label: "D", text: "Zwitterion", isCorrect: false },
  ],
  authoredBy: "AI" as const,
  ...over,
});

const lesson = (over: Partial<LessonForCheck> = {}): LessonForCheck => ({
  title: "Dopamine, read three ways",
  objectives: ["Predict protonation state from pKa and pH"],
  steps: [
    { position: 0, kind: "TEACH", concept: "protonation", body: "Amines are bases." },
    { position: 1, kind: "TEST", concept: "protonation", questionId: "q1", question: q() },
    { position: 2, kind: "REMEDIATE", concept: "protonation", body: "Right: here's why." },
    { position: 3, kind: "RETEST", concept: "protonation", questionId: "q2", question: q({ stem: "A drug with pKa 8.4 at pH 7.4: fraction protonated?" }) },
  ],
  ...over,
});

describe("AI content publish gate", () => {
  it("an AI-drafted question cannot be published without a recorded admin review", () => {
    expect(questionPublishProblems(q())).toContain("This question was drafted by AI and needs an admin's review approval first.");
    expect(questionPublishProblems(q({ reviewedById: "admin-1" }))).toEqual([]);
    expect(questionPublishProblems(q({ authoredBy: "HUMAN" }))).toEqual([]);
  });

  it("only admins approve, and AI content needs an explicit review attestation", () => {
    expect(approvalProblem({ approverRole: "STUDENT", authoredBy: "HUMAN", attestedReview: true })).toMatch(/Only an admin/);
    expect(approvalProblem({ approverRole: null, authoredBy: "AI", attestedReview: true })).toMatch(/Only an admin/);
    expect(approvalProblem({ approverRole: "ADMIN", authoredBy: "AI", attestedReview: false })).toMatch(/AI-drafted/);
    expect(approvalProblem({ approverRole: "ADMIN", authoredBy: "AI", attestedReview: true })).toBeNull();
    expect(approvalProblem({ approverRole: "ADMIN", authoredBy: "HUMAN", attestedReview: false })).toBeNull();
  });

  it("a lesson of AI questions publishes only as part of an approval", () => {
    expect(lessonPublishProblems(lesson(), false).some((p) => /drafted by AI/.test(p))).toBe(true);
    expect(lessonPublishProblems(lesson(), true)).toEqual([]);
  });
});

describe("lesson structure", () => {
  it("every test needs a later retest on the same concept, with a different question", () => {
    const noRetest = lesson({ steps: lesson().steps.slice(0, 3) });
    expect(lessonPublishProblems(noRetest, true)).toContain("The test on “protonation” has no retest on the same concept.");
    const sameQ = lesson();
    sameQ.steps[3] = { ...sameQ.steps[3], questionId: "q1" };
    expect(lessonPublishProblems(sameQ, true)).toContain("The retest on “protonation” must use a different question.");
  });

  it("tests must map at least one wrong answer to a misconception", () => {
    const l = lesson();
    l.steps[1] = { ...l.steps[1], question: q({ choices: q().choices.map((c) => ({ ...c, misconceptionId: null })) }) };
    expect(lessonPublishProblems(l, true)).toContain("The test on “protonation” maps no wrong answer to a misconception.");
  });

  it("rejects empty objectives, gaps in steps, and remediation before the test", () => {
    const l = lesson({ objectives: [" "] });
    l.steps = [l.steps[0], { ...l.steps[2], position: 1 }, { ...l.steps[1], position: 3 }, { ...l.steps[3], position: 4 }];
    const p = lessonPublishProblems(l, true);
    expect(p).toContain("List at least one learning objective.");
    expect(p).toContain("Step positions have gaps or repeats.");
    expect(p).toContain("Step 2 remediates “protonation” before it is tested.");
  });
});
