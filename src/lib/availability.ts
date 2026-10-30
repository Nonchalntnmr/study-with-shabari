// What a visitor can open right now. Until Shabari approves the practice sets and the lesson, no
// link may promise them: links to them are hidden and the copy says they're coming. The notes page
// stays linked (each note says "Link coming soon"), but no button offers to open notes that have no
// link yet. Every input is published data (getAvailability in public-data.ts), so approving content
// in /admin brings its links back with no code change.

export type Availability = { practice: boolean; lesson: boolean; notes: boolean };

/** Links that lead to one kind of content, and so are shown only while it's available. */
const GATED: Record<string, keyof Availability> = {
  "/practice": "practice",
  "/mcat#lesson": "lesson",
};

export function availableLinks<T extends { href: string }>(links: readonly T[], a: Availability): T[] {
  return links.filter((l) => {
    const needs = GATED[l.href];
    return !needs || a[needs];
  });
}

/** The spec's "really free?" answer, plus what hasn't opened yet. */
const FREE_QUESTION = "Are the notes and practice tests really free?";

export function faqForVisitors<T extends { q: string; a: string }>(items: readonly T[], a: Availability): T[] {
  const missing = [!a.notes && "notes", !a.practice && "practice sets"].filter(Boolean);
  if (missing.length === 0) return [...items];
  const note = `The ${missing.join(" and ")} are coming soon.`;
  return items.map((f) => (f.q === FREE_QUESTION ? { ...f, a: `${f.a} ${note}` } : f));
}

/** The quieter second link in a hero: practice when there is some, tutoring otherwise. */
export function practiceOrTutoring(a: Availability, practiceLabel: string, tutoringHref: string) {
  return a.practice ? { href: "/practice", label: practiceLabel } : { href: tutoringHref, label: "Explore MCAT tutoring" };
}
