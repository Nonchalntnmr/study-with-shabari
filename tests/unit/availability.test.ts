import { describe, expect, it } from "vitest";
import { availableLinks, faqForVisitors, practiceOrTutoring, type Availability } from "@/lib/availability";
import { faq, nav } from "@/lib/founder-facts";

const NONE: Availability = { practice: false, lesson: false, notes: false };
const ALL: Availability = { practice: true, lesson: true, notes: true };
const footer = [
  { href: "/mcat", label: "MCAT tutoring" },
  { href: "/practice", label: "Free practice test" },
  { href: "/resources", label: "Free notes" },
  { href: "/mcat#lesson", label: "Free interactive lesson" },
];

describe("availability: nothing approved yet", () => {
  it("drops every link to practice and the lesson from the nav and footer", () => {
    const hrefs = [...availableLinks(nav, NONE), ...availableLinks(footer, NONE)].map((l) => l.href);
    expect(hrefs).not.toContain("/practice");
    expect(hrefs).not.toContain("/mcat#lesson");
    // The notes page stays: it lists each note with "Link coming soon".
    expect(hrefs).toContain("/resources");
    expect(hrefs).toContain("/mcat");
    expect(hrefs).toContain("/admissions");
  });

  it("keeps the spec's FAQ answer and says what is still coming", () => {
    const free = faqForVisitors(faq, NONE).find((f) => f.q.startsWith("Are the notes"))!;
    expect(free.a).toBe("Yes, no signup. The notes and practice sets are coming soon.");
    expect(faqForVisitors(faq, { ...ALL, notes: false }).find((f) => f.q.startsWith("Are the notes"))!.a).toBe("Yes, no signup. The notes are coming soon.");
    expect(faqForVisitors(faq, { ...ALL, practice: false }).find((f) => f.q.startsWith("Are the notes"))!.a).toBe("Yes, no signup. The practice sets are coming soon.");
  });

  it("points the hero's second link at tutoring instead of an empty practice page", () => {
    expect(practiceOrTutoring(NONE, "Free practice test", "/mcat")).toEqual({ href: "/mcat", label: "Explore MCAT tutoring" });
  });
});

describe("availability: once content is approved, every link comes back unchanged", () => {
  it("restores the nav, footer, FAQ and hero links", () => {
    expect(availableLinks(nav, ALL)).toEqual(nav);
    expect(availableLinks(footer, ALL)).toEqual(footer);
    expect(faqForVisitors(faq, ALL)).toEqual(faq);
    expect(practiceOrTutoring(ALL, "Free practice test", "/mcat")).toEqual({ href: "/practice", label: "Free practice test" });
  });

  it("gates each kind on its own content", () => {
    expect(availableLinks(footer, { ...NONE, practice: true }).map((l) => l.href)).toEqual(["/mcat", "/practice", "/resources"]);
    expect(availableLinks(footer, { ...NONE, lesson: true }).map((l) => l.href)).toEqual(["/mcat", "/resources", "/mcat#lesson"]);
  });
});
