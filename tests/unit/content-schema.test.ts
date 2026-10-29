import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ImportValidationError, parseBank } from "@/lib/content/import";

const sample = () => JSON.parse(readFileSync("content/samples/sample-bank.json", "utf8"));

describe("content import schema", () => {
  it("accepts the shipped sample bank", () => {
    const bank = parseBank(sample());
    expect(bank.exams).toHaveLength(3);
  });

  it("rejects a question without exactly one correct choice", () => {
    const bank = sample();
    bank.exams[0].items[1].choices.forEach((c: { correct?: boolean }) => (c.correct = false));
    expect(() => parseBank(bank)).toThrow(ImportValidationError);
    try {
      parseBank(bank);
    } catch (e) {
      expect((e as ImportValidationError).issues.join("\n")).toMatch(/exactly one correct choice, has 0/);
    }
  });

  it("rejects unknown topics, duplicate ids and out-of-order labels", () => {
    const bank = sample();
    bank.exams[0].items[1].topics = ["no-such-topic"];
    bank.exams[1].items[1].id = bank.exams[0].items[2].id;
    bank.exams[2].items[1].choices[0].label = "B";
    let issues: string[] = [];
    try {
      parseBank(bank);
    } catch (e) {
      issues = (e as ImportValidationError).issues;
    }
    const all = issues.join("\n");
    expect(all).toMatch(/unknown topic "no-such-topic"/);
    expect(all).toMatch(/duplicate question id/);
    expect(all).toMatch(/choice labels must be A, B, C, D in order/);
  });

  it("every sample question has exactly four choices and a rationale for each", () => {
    for (const exam of parseBank(sample()).exams) {
      for (const item of exam.items) {
        for (const q of item.type === "passage" ? item.questions : [item]) {
          expect(q.choices).toHaveLength(4);
          for (const c of q.choices) expect(c.rationale, `${q.id} ${c.label}`).toBeTruthy();
        }
      }
    }
  });
});
