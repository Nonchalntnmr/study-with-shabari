import { describe, expect, it } from "vitest";
import { examPublishProblems, questionPublishProblems, roleChangeProblem, testimonialPublishProblems } from "./rules";
import { contiguityProblem, ctaHrefProblem, httpsUrlProblem, insertPosition, moveItem, parseFeatures, slugProblem } from "./editor-rules";

const good = {
  stem: "Which organelle produces most cellular ATP?",
  explanation: "Oxidative phosphorylation occurs in the mitochondria.",
  choices: [
    { label: "A", text: "Nucleus", isCorrect: false },
    { label: "B", text: "Mitochondrion", isCorrect: true },
    { label: "C", text: "Golgi apparatus", isCorrect: false },
    { label: "D", text: "Ribosome", isCorrect: false },
  ],
};

describe("questionPublishProblems", () => {
  it("accepts a well-formed question", () => {
    expect(questionPublishProblems(good)).toEqual([]);
  });
  it("requires exactly one correct choice", () => {
    const none = { ...good, choices: good.choices.map((c) => ({ ...c, isCorrect: false })) };
    const two = { ...good, choices: good.choices.map((c) => ({ ...c, isCorrect: true })) };
    expect(questionPublishProblems(none)).toContain("Mark one choice as correct.");
    expect(questionPublishProblems(two)).toContain("Only one choice can be correct.");
  });
  it("requires four labelled choices and an explanation", () => {
    const p = questionPublishProblems({ ...good, explanation: "", choices: good.choices.slice(0, 3) });
    expect(p).toContain("Add an explanation before publishing.");
    expect(p).toContain("A question needs exactly four choices labelled A, B, C and D.");
  });
  it("catches duplicate choice text", () => {
    const dup = { ...good, choices: good.choices.map((c) => ({ ...c, text: "Same" })) };
    expect(questionPublishProblems(dup)).toContain("Two choices have identical text.");
  });
});

describe("examPublishProblems", () => {
  it("rejects an empty exam", () => {
    expect(examPublishProblems({ items: [] })).toEqual(["The exam has no questions."]);
  });
  it("rejects unpublished questions", () => {
    const p = examPublishProblems({ items: [{ position: 0, questionStatus: "DRAFT" }, { position: 1, questionStatus: "PUBLISHED" }] });
    expect(p[0]).toContain("1 question is not published yet.");
  });
  it("accepts a complete exam", () => {
    expect(examPublishProblems({ items: [{ position: 0, questionStatus: "PUBLISHED" }, { position: 1, questionStatus: "PUBLISHED" }] })).toEqual([]);
  });
});

describe("testimonialPublishProblems", () => {
  it("blocks publishing without recorded consent", () => {
    expect(testimonialPublishProblems({ consentConfirmed: false, quote: "Great tutor, truly helped me." })).toHaveLength(1);
  });
  it("allows a consented, real quote", () => {
    expect(testimonialPublishProblems({ consentConfirmed: true, quote: "Great tutor, truly helped me." })).toEqual([]);
  });
});

describe("roleChangeProblem", () => {
  it("stops self-demotion", () => {
    expect(roleChangeProblem({ actorId: "a", targetId: "a", targetRole: "ADMIN", newRole: "STUDENT", adminCount: 3 })).not.toBeNull();
  });
  it("keeps at least one admin", () => {
    expect(roleChangeProblem({ actorId: "a", targetId: "b", targetRole: "ADMIN", newRole: "STUDENT", adminCount: 1 })).not.toBeNull();
  });
  it("allows promoting and ordinary demotion", () => {
    expect(roleChangeProblem({ actorId: "a", targetId: "b", targetRole: "STUDENT", newRole: "ADMIN", adminCount: 1 })).toBeNull();
    expect(roleChangeProblem({ actorId: "a", targetId: "b", targetRole: "ADMIN", newRole: "STUDENT", adminCount: 2 })).toBeNull();
  });
});

describe("editor rules", () => {
  it("validates slugs", () => {
    expect(slugProblem("cp-set-2")).toBeNull();
    expect(slugProblem("CP Set")).not.toBeNull();
    expect(slugProblem("-x")).not.toBeNull();
  });

  it("accepts only https links, and site paths for buttons", () => {
    expect(httpsUrlProblem("https://docs.google.com/document/d/1")).toBeNull();
    expect(httpsUrlProblem("http://example.com")).not.toBeNull();
    expect(httpsUrlProblem("javascript:alert(1)")).not.toBeNull();
    expect(ctaHrefProblem("/book")).toBeNull();
    expect(ctaHrefProblem("https://calendly.com/x")).toBeNull();
    expect(ctaHrefProblem("//evil.example")).not.toBeNull();
    expect(ctaHrefProblem("javascript:alert(1)")).not.toBeNull();
  });

  it("parses one feature per line", () => {
    expect(parseFeatures("  10 sessions\r\n\n2 exams  \n")).toEqual(["10 sessions", "2 exams"]);
  });

  it("keeps passage questions together", () => {
    const q = (questionId: string, passageId: string | null) => ({ questionId, passageId });
    expect(contiguityProblem([q("1", "p"), q("2", "p"), q("3", null), q("4", "r")])).toBeNull();
    expect(contiguityProblem([q("1", "p"), q("2", null), q("3", "p")])).not.toBeNull();
    expect(insertPosition([q("1", "p"), q("2", "p"), q("3", null)], "p")).toBe(2);
    expect(insertPosition([q("1", "p")], null)).toBe(1);
    expect(insertPosition([q("1", "p")], "other")).toBe(1);
  });

  it("moves items within bounds only", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, "down")).toEqual(["a", "b", "c"]);
  });
});
