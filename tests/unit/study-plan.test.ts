import { describe, expect, it } from "vitest";
import { buildStudyPlan, type PlanExam } from "@/lib/study-plan";

const base = { today: new Date("2026-10-29T12:00:00Z"), sectionLabel: (c: string) => c, weakTopics: [] };
const exams: PlanExam[] = [
  { slug: "cp", title: "CP 1", section: "CP", attempted: false, bestAccuracy: null },
  { slug: "bb", title: "BB 1", section: "BB", attempted: true, bestAccuracy: 0.5 },
  { slug: "ps", title: "PS 1", section: "PS", attempted: false, bestAccuracy: null },
];

describe("buildStudyPlan", () => {
  it("asks for a test date and a first set in each section when there's no data", () => {
    const plan = buildStudyPlan({ ...base, testDate: null, sections: [], exams });
    expect(plan.phase).toBe("no-date");
    expect(plan.hasData).toBe(false);
    expect(plan.tasks.at(-1)).toMatch(/one practice set in each section/);
  });

  it("picks the phase from weeks left", () => {
    const at = (days: number) => buildStudyPlan({ ...base, testDate: new Date(base.today.getTime() + days * 86_400_000), sections: [], exams }).phase;
    expect(at(120)).toBe("content");
    expect(at(60)).toBe("practice");
    expect(at(20)).toBe("final");
    expect(at(-3)).toBe("past");
  });

  it("orders focus by weakest section and recommends unattempted sets first, then weak retakes", () => {
    const plan = buildStudyPlan({
      ...base,
      testDate: null,
      sections: [
        { section: "CP", answered: 8, accuracy: 0.9 },
        { section: "BB", answered: 8, accuracy: 0.5 },
        { section: "PS", answered: 8, accuracy: 0.7 },
      ],
      exams,
    });
    expect(plan.focusSections).toEqual(["BB", "PS", "CP"]);
    expect(plan.nextSets.map((e) => e.slug)).toEqual(["ps", "cp", "bb"]);
    expect(plan.tasks).toContain("Retake “BB 1” and compare with your last attempt.");
  });

  it("names weak topics in tasks, never invented ones", () => {
    const plan = buildStudyPlan({ ...base, testDate: null, sections: [{ section: "CP", answered: 5, accuracy: 0.4 }], weakTopics: [{ name: "Circuits", answered: 4, accuracy: 0.25 }], exams: [] });
    expect(plan.tasks).toEqual(["Review your notes on Circuits, then redo the questions you missed on it."]);
  });
});
