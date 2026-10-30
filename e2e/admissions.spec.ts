import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  admissionsHeadline,
  admissionsHelp,
  admissionsPricing,
  admissionsResults,
  admissionsTimeline,
  essayCredentials,
  highSchool,
  mentoring,
  paymentNote,
  writingPrizes,
} from "../src/lib/founder-facts";

// The admissions redesign (paper, index cards, the application as six stations) changed layout and
// visuals only. These checks hold it to that: every approved fact and link from before, in the same
// order, visible without any interaction; the booking button on a phone's first screen; no overflow;
// nothing moving with reduced motion; visible keyboard focus; and axe clean.

const BOOK = "/book?service=admissions";
const SCHOLARSHIP = (s: { note: string | null }) => /full ride/.test(s.note ?? "");

/** Every approved line on the page, in page order (the order the page had before the redesign). */
const FACTS: string[] = [
  "College Admissions Consulting",
  ...admissionsResults.filter((a) => !SCHOLARSHIP(a)).flatMap((a) => [a.school, ...(a.note ? [`(${a.note})`] : [])]),
  admissionsHeadline,
  "Book a free consult call",
  "What I help with",
  highSchool.title,
  ...highSchool.stats.flatMap((s) => [s.label, s.value]),
  highSchool.disclaimer,
  "Also admitted, with scholarships",
  ...admissionsResults.filter(SCHOLARSHIP).flatMap((a) => [a.school, `(${a.note})`]),
  "Why trust me with your essays",
  "Three MIT writing prizes, and a news editor’s desk at The Tech.",
  ...writingPrizes.flatMap(([name, placing]) => [name, `MIT · ${placing.replace(/^\((\d{4})\)$/, "$1")}`]),
  ...essayCredentials,
  "What I help with",
  "The whole application, piece by piece.",
  ...admissionsHelp.flatMap((h) => [h.title, h.body]),
  ...admissionsTimeline.flatMap((t) => [t.when, t.what]),
  "When should high schoolers start? Junior year for planning; essays the summer before senior year.",
  "My high school record",
  "The record behind the admissions.",
  highSchool.disclaimer,
  "IB Diploma",
  "40/45",
  ...highSchool.ib.flatMap((s) => [s.level, s.subject, String(s.score)]),
  "Subject scores out of 7.",
  highSchool.extendedEssay,
  "Activities",
  ...highSchool.activities,
  "Experience mentoring students",
  "Mentoring students through MIT programs.",
  ...mentoring,
  "Admissions pricing",
  "Every option starts with a free call.",
  ...admissionsPricing.flatMap((p) => [p.name, p.price ?? "Priced on your consult call", ...(p.includes ? [p.includes] : [])]),
  paymentNote,
  "Book a free consult call.",
  "Talk through your plan for college admissions",
  "Book a free consult call",
  "Independent consulting. Not affiliated with or endorsed by MIT or any other university.",
];

/** Lines long enough to be unambiguous on the page, checked one by one for visibility. */
const LINES = [...new Set(FACTS.filter((f) => f.length > 12))];

async function expectEveryFact(page: Page) {
  // In order: each fact is found after the one before it in the page's text.
  const order = await page.locator("main").evaluate((main, facts) => {
    const text = (main as HTMLElement).innerText.replace(/\s+/g, " ");
    let from = 0;
    const missing: string[] = [];
    for (const f of facts) {
      const at = text.indexOf(f.replace(/\s+/g, " "), from);
      if (at < 0) missing.push(f);
      else from = at + f.length;
    }
    return missing;
  }, FACTS);
  expect(order, "facts missing or out of order").toEqual([]);

  const main = page.locator("main");
  for (const line of LINES) await expect(main.getByText(line, { exact: false }).first(), line).toBeVisible();

  const schools = main.getByRole("list", { name: "Admitted to" });
  for (const a of admissionsResults.filter((r) => !SCHOLARSHIP(r))) await expect(schools.getByRole("listitem").filter({ hasText: new RegExp(`^${a.school}`) })).toBeVisible();
  for (const s of highSchool.stats) await expect(main.getByRole("definition").filter({ hasText: new RegExp(`^${s.value.replace(/[/.]/g, "\\$&")}$`) })).toBeVisible();
  await expect(main.getByRole("figure", { name: /IB Diploma/ })).toBeVisible();
  await expect(main.getByRole("img", { name: "Shabari Shankar" })).toBeVisible();
  await expect(main.getByRole("list", { name: "When to start" }).getByRole("listitem")).toHaveCount(admissionsTimeline.length);
  await expect(main.locator("#admissions-pricing").getByText("Priced on your consult call")).toHaveCount(admissionsPricing.filter((p) => !p.price).length);

  // The six stations, in order, each with its words on screen: nothing is behind a tab or a click.
  const stations = main.locator("#help ol").first().getByRole("listitem");
  await expect(stations).toHaveCount(admissionsHelp.length);
  for (const [i, h] of admissionsHelp.entries()) {
    await expect(stations.nth(i).getByRole("heading", { level: 3, name: h.title })).toBeVisible();
    await expect(stations.nth(i).getByText(h.body, { exact: true })).toBeVisible();
  }

  // The links, as before.
  const book = main.getByRole("link", { name: "Book a free consult call" });
  await expect(book).toHaveCount(2);
  for (const l of await book.all()) await expect(l).toHaveAttribute("href", BOOK);
  await expect(main.getByRole("link", { name: "What I help with" })).toHaveAttribute("href", "#help");
  for (const id of ["essays", "help", "record", "mentoring", "admissions-pricing"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  const scholarshipCard = main.getByTestId("scholarship-offers-card");
  await expect(scholarshipCard).toBeVisible();
  await expect(scholarshipCard).toContainText("Also admitted, with scholarships");
  await expect(scholarshipCard).toContainText("Johns Hopkins");
  await expect(scholarshipCard).toContainText("(Hodson Trust Scholar, near full ride)");
  await expect(scholarshipCard).toContainText("Wake Forest");
  await expect(scholarshipCard).toContainText("(Carswell Scholar, full ride)");
  await expect(scholarshipCard).toContainText("UT Dallas");
  await expect(scholarshipCard).toContainText("(McDermott Scholar, full ride)");
}

async function axeSeriousOrCritical(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
}

test.describe("admissions, desktop 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every approved fact, link and the booking CTA, in order, with the page's metadata", async ({ page }) => {
    await page.goto("/admissions");
    await expect(page).toHaveTitle("College Admissions Consulting · Study with Shabari");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/admissions$/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      `${admissionsHeadline} Essays, activities list, school list, interview prep, application timeline, and SAT and ACT strategy.`,
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(admissionsHeadline);
    await expectEveryFact(page);
    // No WebGL here, so there is no fallback to keep in step.
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("the booking CTA opens booking with College Admissions selected", async ({ page }) => {
    await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title>" }));
    await page.goto("/admissions");
    await page.getByRole("main").getByRole("link", { name: "Book a free consult call" }).first().click();
    await expect(page).toHaveURL(/\/book\?service=admissions$/);
    await expect(page.getByRole("tab", { name: "College Admissions" })).toHaveAttribute("aria-selected", "true");
  });

  test("keyboard: every link in the page content shows a visible focus ring", async ({ page }) => {
    await page.goto("/admissions");
    const main = page.getByRole("main");
    const targets = [
      main.getByRole("link", { name: "Book a free consult call" }).first(),
      main.getByRole("link", { name: "What I help with" }),
      main.getByRole("link", { name: "Book a free consult call" }).last(),
    ];
    // Reach each by Tab from the element before it, so :focus-visible applies as it does for a keyboard user.
    for (const t of targets) {
      await t.evaluate((el) => {
        const all = [...document.querySelectorAll<HTMLElement>("a[href], button, [tabindex]:not([tabindex='-1'])")].filter((n) => n.offsetParent !== null || getComputedStyle(n).position === "fixed");
        all[all.indexOf(el as HTMLElement) - 1]?.focus();
      });
      await page.keyboard.press("Tab");
      await expect(t).toBeFocused();
      const ring = await t.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, visible: el.matches(":focus-visible") };
      });
      expect(ring.visible).toBe(true);
      expect(ring.style).not.toBe("none");
      expect(ring.width).toBeGreaterThanOrEqual(2);
    }
  });

  test("scrolling is never taken over: a wheel scroll moves the page by exactly that much", async ({ page }) => {
    await page.goto("/admissions");
    await page.mouse.move(700, 500);
    for (const target of [900, 2400, 3600]) {
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, target - before);
      await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(target);
    }
  });

  test("axe: no serious or critical issues", async ({ page }) => {
    await page.goto("/admissions");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
});

test.describe("admissions, iPhone 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("the booking CTA is in the first viewport, and the page never scrolls sideways", async ({ page }) => {
    await page.goto("/admissions");
    const cta = page.getByRole("main").getByRole("link", { name: "Book a free consult call" }).first();
    await expect(cta).toBeInViewport({ ratio: 1 });
    const box = (await cta.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await expect(cta).toHaveAttribute("href", BOOK);

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, vw: window.innerWidth }));
      expect(wide.doc, `overflow at ${y}px`).toBeLessThanOrEqual(wide.vw);
      expect(wide.body, `overflow at ${y}px`).toBeLessThanOrEqual(wide.vw);
    }
  });

  test("every approved fact on a phone", async ({ page }) => {
    await page.goto("/admissions");
    await expectEveryFact(page);
  });

  test("axe: no serious or critical issues on a phone", async ({ page }) => {
    await page.goto("/admissions");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
});

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(`admissions, reduced motion, ${name}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("everything is shown statically: the line drawn, nothing animating, every fact on the page", async ({ page }) => {
      await page.goto("/admissions");
      await page.locator("#help").scrollIntoViewIfNeeded();
      const still = await page.evaluate(() => ({
        animations: (document.querySelector("main")?.getAnimations({ subtree: true }) ?? []).filter((a) => a.playState === "running").length,
        animated: [...document.querySelectorAll("main *")].filter((el) => getComputedStyle(el).animationName !== "none").length,
        inks: [...document.querySelectorAll(".adm-seg-ink")].map((el) => getComputedStyle(el).transform),
        discs: [...document.querySelectorAll(".adm-disc")].map((el) => getComputedStyle(el).transform),
      }));
      expect(still.animations).toBe(0);
      expect(still.animated).toBe(0);
      expect(still.inks).toHaveLength(admissionsHelp.length - 1);
      expect(still.inks.every((t) => t === "none")).toBe(true);
      expect(still.discs.every((t) => t === "none")).toBe(true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expectEveryFact(page);
      expect(await axeSeriousOrCritical(page)).toEqual([]);
    });
  });
}
