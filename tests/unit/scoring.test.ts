import { describe, expect, it } from "vitest";
import { percent, scoreAttempt, topicBreakdown, weakestTopics } from "@/lib/exam/scoring";

const t = (slug: string) => ({ slug, name: slug.toUpperCase() });
const questions = [
  { id: "q1", correctChoiceId: "a", topics: [t("acid")] },
  { id: "q2", correctChoiceId: "b", topics: [t("acid"), t("phys")] },
  { id: "q3", correctChoiceId: "c", topics: [t("phys")] },
];

describe("scoreAttempt", () => {
  it("counts only selected correct choices and treats unanswered as incorrect", () => {
    const { items, correct, total } = scoreAttempt(questions, [
      { questionId: "q1", selectedChoiceId: "a", timeSpentMs: 1000 },
      { questionId: "q2", selectedChoiceId: "x", timeSpentMs: 2000 },
    ]);
    expect(correct).toBe(1);
    expect(total).toBe(3);
    expect(items.map((i) => [i.isCorrect, i.answered])).toEqual([
      [true, true],
      [false, true],
      [false, false],
    ]);
  });

  it("a question with no correct choice can never be marked correct", () => {
    const { correct } = scoreAttempt([{ id: "q", correctChoiceId: null, topics: [] }], [{ questionId: "q", selectedChoiceId: null, timeSpentMs: 0 }]);
    expect(correct).toBe(0);
  });
});

describe("topicBreakdown", () => {
  it("counts multi-topic questions toward each topic and sorts weakest first", () => {
    const stats = topicBreakdown(questions, [
      { questionId: "q1", isCorrect: true },
      { questionId: "q2", isCorrect: false },
      { questionId: "q3", isCorrect: false },
    ]);
    expect(stats).toEqual([
      { slug: "phys", name: "PHYS", correct: 0, total: 2, accuracy: 0 },
      { slug: "acid", name: "ACID", correct: 1, total: 2, accuracy: 0.5 },
    ]);
    expect(weakestTopics(stats, 3, 2).map((s) => s.slug)).toEqual(["phys", "acid"]);
    expect(weakestTopics(stats, 3, 3)).toEqual([]);
  });
});

describe("percent", () => {
  it("rounds and handles zero totals", () => {
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBe(0);
  });
});
