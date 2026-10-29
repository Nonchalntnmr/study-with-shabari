import { describe, expect, it } from "vitest";
import {
  attemptTrend,
  bySection,
  byDifficulty,
  momentum,
  pacing,
  pct,
  tally,
  weakestTopics,
  wilsonLowerBound,
  type ScoredResponse,
} from "./compute";

let n = 0;
function row(over: Partial<ScoredResponse> = {}): ScoredResponse {
  n += 1;
  return {
    questionId: `q${n}`,
    attemptId: "a1",
    section: "BB",
    topics: ["genetics"],
    isCorrect: true,
    timeSpentMs: 60_000,
    difficulty: 3,
    answeredAt: new Date(2026, 9, 1, 12, 0, n),
    ...over,
  };
}

describe("tally", () => {
  it("returns nulls for no data instead of dividing by zero", () => {
    expect(tally([])).toEqual({ answered: 0, correct: 0, accuracy: null, avgTimeSec: null });
  });
  it("computes accuracy and average time", () => {
    const t = tally([row(), row({ isCorrect: false, timeSpentMs: 120_000 })]);
    expect(t.accuracy).toBe(0.5);
    expect(t.avgTimeSec).toBe(90);
  });
  it("ignores negative times", () => {
    expect(tally([row({ timeSpentMs: -5000 })]).avgTimeSec).toBe(0);
  });
});

describe("wilsonLowerBound", () => {
  it("does not let a tiny perfect sample outrank a large strong one", () => {
    expect(wilsonLowerBound(1, 1)).toBeLessThan(wilsonLowerBound(18, 20));
  });
  it("is 0 with no data and never negative", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(0, 10)).toBeGreaterThanOrEqual(0);
  });
});

describe("weakestTopics", () => {
  it("skips topics below the minimum sample and ranks the rest", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => row({ topics: ["kinetics"], isCorrect: false })),
      ...Array.from({ length: 5 }, () => row({ topics: ["genetics"], isCorrect: true })),
      row({ topics: ["thermo"], isCorrect: false }),
    ];
    const weak = weakestTopics(rows, 5, 3);
    expect(weak.map((t) => t.topic)).toEqual(["kinetics", "genetics"]);
  });
  it("counts a multi-topic question toward each topic", () => {
    const rows = Array.from({ length: 3 }, () => row({ topics: ["a", "b"] }));
    expect(weakestTopics(rows, 5, 3)).toHaveLength(2);
  });
});

describe("attemptTrend and momentum", () => {
  it("orders attempts oldest first", () => {
    const rows = [
      row({ attemptId: "late", answeredAt: new Date(2026, 9, 9) }),
      row({ attemptId: "early", answeredAt: new Date(2026, 9, 2) }),
    ];
    expect(attemptTrend(rows).map((p) => p.attemptId)).toEqual(["early", "late"]);
  });
  it("needs enough attempts before reporting momentum", () => {
    const rows = [row({ attemptId: "x" }), row({ attemptId: "y" })];
    expect(momentum(attemptTrend(rows), 3)).toBeNull();
  });
  it("reports the change between the last and previous windows", () => {
    const rows: ScoredResponse[] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(row({ attemptId: `t${i}`, isCorrect: i >= 3, answeredAt: new Date(2026, 9, i + 1) }));
    }
    expect(momentum(attemptTrend(rows), 3)).toBe(1);
  });
});

describe("pacing", () => {
  it("flags rushed misses and slow hits relative to the median", () => {
    const rows = [
      row({ timeSpentMs: 60_000 }),
      row({ timeSpentMs: 60_000 }),
      row({ timeSpentMs: 10_000, isCorrect: false }),
      row({ timeSpentMs: 150_000, isCorrect: true }),
      row({ timeSpentMs: 60_000 }),
    ];
    const p = pacing(rows);
    expect(p.medianSec).toBe(60);
    expect(p.fastWrong).toBe(1);
    expect(p.slowRight).toBe(1);
  });
});

describe("grouping helpers", () => {
  it("groups by section", () => {
    const rows = [row({ section: "CP" }), row({ section: "BB" }), row({ section: "CP", isCorrect: false })];
    const s = bySection(rows);
    expect(s.map((x) => x.section)).toEqual(["BB", "CP"]);
    expect(s[1].accuracy).toBe(0.5);
  });
  it("bands difficulty and drops empty bands", () => {
    const bands = byDifficulty([row({ difficulty: 1 }), row({ difficulty: 5 }), row({ difficulty: null })]);
    expect(bands.map((b) => b.band)).toEqual(["easier", "harder", "unrated"]);
  });
  it("formats percentages", () => {
    expect(pct(0.756)).toBe("76%");
    expect(pct(null)).toBe("—");
  });
});
