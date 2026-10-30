import { expect, test, type APIRequestContext } from "@playwright/test";

// No page may link to a practice set or the lesson that isn't published, or offer to open notes that
// have no link (src/lib/availability.ts). The test reads what is actually open from the site itself,
// so it holds locally (samples published) and on production (nothing approved yet):
//   SMOKE_BASE_URL=https://studywithshabari.com npx playwright test --project post-deploy
const PAGES = ["/", "/mcat", "/admissions", "/practice", "/resources", "/faq", "/pricing", "/about", "/research", "/testimonials", "/book", "/contact", "/does-not-exist"];

const html = async (request: APIRequestContext, path: string) => (await request.get(path)).text();

/** Every <a> in the server HTML, with its visible text. */
function anchors(body: string) {
  return [...body.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, inner]) => ({
    href,
    text: inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
}

test("links promise only the practice, lesson and notes that are open", async ({ request }) => {
  test.setTimeout(90_000);
  const practiceOpen = !(await html(request, "/practice")).includes("New practice sets are on the way");
  const lessonPage = await html(request, "/lessons/dopamine");
  const lessonOpen = !lessonPage.includes("This page doesn’t exist") && !lessonPage.includes("This page doesn&#x27;t exist");
  const notesOpen = anchors(await html(request, "/resources")).some((a) => /Open notes/.test(a.text));
  test.info().annotations.push({ type: "open", description: JSON.stringify({ practiceOpen, lessonOpen, notesOpen }) });

  for (const path of PAGES) {
    const body = await html(request, path);
    const links = anchors(body);
    if (!practiceOpen) {
      expect(links.filter((a) => a.href.startsWith("/practice")), `${path}: link to practice`).toEqual([]);
      expect(links.filter((a) => /practice (test|set)/i.test(a.text)), `${path}: practice CTA`).toEqual([]);
      expect(body, `${path}: "Available now"`).not.toContain("Available now");
    }
    if (!lessonOpen) {
      expect(links.filter((a) => a.href.startsWith("/lessons/") || a.href === "/mcat#lesson"), `${path}: link to the lesson`).toEqual([]);
      expect(links.filter((a) => /start the (free )?lesson/i.test(a.text)), `${path}: lesson CTA`).toEqual([]);
    }
    if (!notesOpen) expect(links.filter((a) => /open the notes/i.test(a.text)), `${path}: notes CTA`).toEqual([]);
  }

  // Once something is open, its way in is there too.
  const home = anchors(await html(request, "/"));
  if (practiceOpen) expect(home.some((a) => a.href === "/practice")).toBe(true);
  if (lessonOpen) expect(home.some((a) => a.href.startsWith("/lessons/"))).toBe(true);
});
