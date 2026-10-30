import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as facts from "@/lib/founder-facts";

// Amendment 4, item 7: every score, award, research claim and school name on the site must match
// docs/FOUNDER-SPEC.md exactly. Comparison ignores only quote style, dash style and letter case.
const norm = (s: string) =>
  s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const spec = norm(readFileSync("docs/FOUNDER-SPEC.md", "utf8"));
const inSpec = (s: string) => spec.includes(norm(s).replace(/\.$/, ""));

// Deliberate departures, each from a written founder decision.
const APPROVED_CHANGES = new Set([
  "BMJ Rapid Responses", // Amendment 4, item 6
  facts.identity.degree, // Amendment 4, item 5
  facts.highSchool.title, // Amendment 4, item 7
  facts.highSchool.disclaimer, // Amendment 4, item 7
  // Founder update 2026-10-30, "make the whole site more humble": plainer wording, no new facts.
  facts.mcatTutoring.headline,
  "Full-length exams and practice questions with explanations",
  facts.admissionsHeadline,
  facts.research.find((r) => r.org === "Beth Israel Lahey Health")!.body, // the spec's note, minus "do not call it published"
]);

function strings(): string[] {
  return [
    facts.headline,
    facts.heroEyebrow,
    facts.heroSubline,
    ...facts.admissionsResults.flatMap((a) => [a.school, a.note ?? ""]),
    ...facts.education,
    ...facts.writingPrizes.flat(),
    facts.writing,
    facts.identity.classOf,
    facts.identity.majors,
    facts.mcatScore.line,
    ...facts.admittedTo,
    facts.admittedLine,
    facts.pennNote,
    ...facts.credibilityStrip,
    facts.mcatTutoring.headline,
    ...facts.mcatTutoring.points,
    facts.practicePlatform,
    facts.notes.headline,
    ...facts.notes.cards.flatMap((c) => [c.title, c.body]),
    ...facts.mcatPricing.flatMap((p) => [p.name, p.price === "Free" ? "" : p.price, ...p.items]),
    facts.admissionsHeadline,
    ...facts.highSchool.stats.map((s) => (s.label === "IB Diploma" ? `${s.label} ${s.value}` : `${s.value} ${s.label}`)),
    ...facts.highSchool.ib.map((s) => `${s.level} ${s.subject} ${s.score}`),
    facts.highSchool.extendedEssay,
    ...facts.highSchool.activities,
    ...facts.admissionsHelp.map((h) => h.body),
    ...facts.essayCredentials,
    ...facts.mentoring,
    ...facts.research.flatMap((r) => [r.org, r.body, r.when ?? ""]),
    ...facts.publications.flatMap((p) => [p.title.replace(/^“|”$/g, ""), p.venue, p.when]),
    ...facts.teaching,
    ...facts.honors,
    facts.mudzi.body,
    ...facts.mudzi.figures.map((f) => `${f.value} ${f.label}`),
    facts.bio,
    facts.paymentNote,
    ...facts.faq.flatMap((f) => [f.q, f.a]),
  ].filter(Boolean);
}

describe("founder facts", () => {
  it("every published fact appears in docs/FOUNDER-SPEC.md, apart from approved wording changes", () => {
    const missing = strings().filter((s) => !APPROVED_CHANGES.has(s) && !inSpec(s));
    expect(missing).toEqual([]);
  });

  it("stays humble: no medical-school or specialty plans, no bragging framing (founder update 2026-10-30)", () => {
    const site = JSON.stringify(Object.values(facts));
    for (const banned of [/plastic surgery/i, /medical school/i, /headed to/i, /now i teach both/i, /teaches this material at MIT/i, /gets you in/i, /5 of 8 Ivies/i]) {
      expect(site).not.toMatch(banned);
    }
    expect(facts.heroEyebrow).toBe("MIT Class of 2027 · Premed");
  });

  it("never calls the Beth Israel manuscript published", () => {
    expect(facts.research.find((r) => r.org === "Beth Israel Lahey Health")!.body).not.toMatch(/\bpublished\b/i);
  });

  it("uses the approved degree and BMJ wording", () => {
    expect(facts.identity.degree).toMatch(/^B\.S\. candidate, MIT Class of 2027/);
    expect(facts.credibilityStrip).toContain("BMJ Rapid Responses");
    expect(facts.credibilityStrip).not.toContain("Published in The BMJ");
    expect(facts.publications.filter((p) => p.venue === "Rapid Response, The BMJ")).toHaveLength(2);
  });
});
