import { describe, expect, it } from "vitest";
import { difficultyBreakdown } from "@/lib/exam/scoring";

describe("results by difficulty", () => {
  it("groups the imported bands (easy 2, medium 3, hard 4) easiest first, skipping empty bands and unrated questions", () => {
    const rows = [
      { difficulty: 2, isCorrect: true },
      { difficulty: 2, isCorrect: false },
      { difficulty: 1, isCorrect: true },
      { difficulty: 4, isCorrect: false },
      { difficulty: null, isCorrect: true },
    ];
    expect(difficultyBreakdown(rows)).toEqual([
      { slug: "easy", name: "Easy", correct: 2, total: 3, accuracy: 2 / 3 },
      { slug: "hard", name: "Hard", correct: 0, total: 1, accuracy: 0 },
    ]);
    expect(difficultyBreakdown([])).toEqual([]);
  });
});
