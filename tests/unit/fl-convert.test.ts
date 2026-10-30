import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { choiceOrder, convertFullLength, type SourceQuestion } from "@/lib/content/fl-convert";

const source: SourceQuestion[] = ["cp", "bb", "ps"].flatMap((s) => JSON.parse(readFileSync(`content/questions/fl1-${s}.json`, "utf8")));

describe("full-length conversion (FL1)", () => {
  const { bank, before, after } = convertFullLength("fl1", source);
  const converted = bank.exams.flatMap((e) => e.items.flatMap((i) => (i.type === "passage" ? i.questions : [i])));

  it("keeps all 177 questions in three 95-minute sections of 10 passages and 15 discretes", () => {
    expect(converted).toHaveLength(177);
    for (const e of bank.exams) {
      expect(e.timeLimitMinutes).toBe(95);
      expect(e.items.filter((i) => i.type === "passage")).toHaveLength(10);
      expect(e.items.filter((i) => i.type === "discrete")).toHaveLength(15);
    }
  });

  it("moves each correct answer with its choice: the marked choice is the source's correct text", () => {
    for (const q of source) {
      const c = converted.find((x) => x.id === q.id.toLowerCase())!;
      expect(c.choices.find((x) => x.correct)!.text).toBe(q.choices[q.answer]);
      expect(c.choices.map((x) => x.text).sort()).toEqual([...q.choices].sort());
      expect(c.explanation).toBe(q.explanation);
    }
  });

  it("is deterministic per question id", () => {
    expect(choiceOrder("FL1-CP-001")).toEqual(choiceOrder("FL1-CP-001"));
    expect(JSON.stringify(convertFullLength("fl1", source).bank)).toBe(JSON.stringify(bank));
  });

  it("evens out the answer letters (B was 30, 43 and 37 of 59; P/S never used D)", () => {
    expect(before.BB.B).toBe(43);
    expect(before.PS.D).toBe(0);
    for (const s of ["CP", "BB", "PS"]) {
      for (const n of Object.values(after[s])) expect(n).toBeGreaterThanOrEqual(8);
      expect(Math.max(...Object.values(after[s]))).toBeLessThanOrEqual(24);
    }
  });

  it("keeps the passage text and the figure description as the passage's caption", () => {
    const p = bank.exams[0].items[0];
    expect(p.type).toBe("passage");
    if (p.type !== "passage") return;
    expect(p.body).toBe(source[0].passage);
    expect(p.figure).toBe(source[0].figure_description);
  });
});
