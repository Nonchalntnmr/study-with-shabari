import { describe, expect, it } from "vitest";
import { checkAnswer, publicQuestions } from "@/lib/lessons/dopamine-page";

// Shabari's answer key for the free dopamine lesson (docs/FOUNDER-SPEC.md, founder update 2026-10-30).
const KEY: Record<string, number> = { q1: 1, q2: 2, q3: 3, q4: 1, q5: 1, q6: 2 };

describe("free dopamine lesson", () => {
  it("has her six questions, and the page data carries no answers or explanations", () => {
    const qs = publicQuestions();
    expect(qs.map((q) => q.id)).toEqual(Object.keys(KEY));
    for (const q of qs) {
      expect(q.choices).toHaveLength(4);
      expect(Object.keys(q).sort()).toEqual(["choices", "id", "stem"]);
    }
  });

  it("marks her answers right and every other choice wrong, with the explanation either way", () => {
    for (const [id, answer] of Object.entries(KEY)) {
      for (let c = 0; c < 4; c++) {
        const r = checkAnswer(id, c);
        expect(r).toMatchObject({ correct: c === answer, answer });
        expect("explanation" in r && r.explanation.length).toBeGreaterThan(20);
      }
    }
  });

  it("refuses unknown questions and malformed choices", () => {
    for (const [id, c] of [["q7", 0], ["q1", 4], ["q1", -1], ["q1", 1.5], [{}, 0], ["q1", "1"]] as const) {
      expect(checkAnswer(id, c)).toHaveProperty("error");
    }
  });
});
