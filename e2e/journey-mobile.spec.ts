import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// The vertical slice (docs/PRODUCT-DIRECTION.md, Amendment 1): a new visitor on a
// phone arrives, sees why Shabari is credible, learns something real in her free
// dopamine lesson (founder update 2026-10-30), gets one wrong, sees why, gets the
// next one right, and books. The lesson engine's own flow (confidence, misconception,
// retest, result) is covered by lesson-visibility.spec.ts and the a11y lesson flow.

// Against a real deployment (SMOKE_BASE_URL), the lesson can still be an unapproved draft, shown with its
// badge on a protected preview, and the Calendly links may not be set yet, in which case booking shows its
// fallback. Locally, both journeys check the exact test fixtures.
const LIVE = Boolean(process.env.SMOKE_BASE_URL);

async function expectBooking(page: Page, slot: string) {
  const frame = page.locator('iframe[title^="Schedule a free consultation"]');
  if (!LIVE) {
    await expect(frame).toHaveAttribute("src", new RegExp(`^https://calendly\\.com/e2e-shabari/${slot}\\?`));
    return;
  }
  const fallback = page.getByText(/Online scheduling for .+ calls is coming soon\./);
  await expect(frame.or(fallback)).toBeVisible();
  if (await frame.count()) await expect(frame).toHaveAttribute("src", /^https:\/\/calendly\.com\//);
  else await expect(page.getByRole("link", { name: "Request a time" })).toBeVisible();
}

async function frameBooking(page: Page) {
  await page.evaluate(() => {
    const target = document.querySelector('iframe[title^="Schedule a free consultation"]') ?? document.querySelector('[role="tabpanel"]');
    if (target) window.scrollTo(0, target.getBoundingClientRect().top + scrollY - 260);
  });
}

const SHOTS = process.env.JOURNEY_SHOTS_DIR ?? path.join(homedir(), "projects/study-with-shabari/.local/shots/concept-b/journey");
const results: { step: number | string; name: string; status: "passed" | "failed"; ms: number; error?: string }[] = [];

async function step(page: Page, n: number | string, name: string, shot: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  await test.step(`${n}. ${name}`, async () => {
    try {
      await fn();
      await page.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${shot}.png`) });
      results.push({ step: n, name, status: "passed", ms: Date.now() - t0 });
    } catch (e) {
      await page.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${shot}-FAILED.png`) }).catch(() => {});
      results.push({ step: n, name, status: "failed", ms: Date.now() - t0, error: e instanceof Error ? e.message.split("\n")[0] : String(e) });
      throw e;
    }
  });
}

/** Top edge (page coordinates) of the first visible element whose own text contains `text`. */
async function firstTop(page: Page, text: string): Promise<number> {
  return page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.includes(t)) continue;
      const el = node.parentElement!;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
      return r.top + window.scrollY;
    }
    return Infinity;
  }, text);
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));
test.afterAll(() => {
  writeFileSync(path.join(SHOTS, "report.json"), JSON.stringify({ ranAt: new Date().toISOString(), device: "iPhone 14 (Chromium emulation)", build: "next build + next start", results }, null, 2));
});

test("journey: homepage → credentials → free dopamine lesson → wrong, then right → booking", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title><main><h1>Calendly (stub)</h1><p>Pick a time</p></main>" }));

  await step(page, 1, "opens the homepage", "home", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("MCAT tutoring and college admissions help, from someone who recently went through both.");
    // Book and practice are both on the first screen of a phone.
    await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeInViewport();
    await expect(page.getByRole("link", { name: "Explore MCAT tutoring" }).first()).toBeInViewport();
  });

  await step(page, 2, "credentials (522, MIT, majors) are in the first two screens", "credentials", async () => {
    const screens = 2 * page.viewportSize()!.height;
    // The founder's 2026-10-30 hero subline names the majors without course numbers.
    for (const text of ["522", "MIT", "Chemistry & Molecular Biology and Neuroscience"]) {
      expect(await firstTop(page, text), `"${text}" within the first two screens`).toBeLessThan(screens);
    }
  });

  await step(page, 3, "goes to MCAT Prep and opens the free dopamine lesson", "lesson", async () => {
    await page.getByRole("link", { name: "Explore MCAT Prep" }).first().click();
    await expect(page).toHaveURL(/\/mcat$/);
    const open = page.getByRole("link", { name: "Read the free dopamine lesson" });
    await open.scrollIntoViewIfNeeded();
    await open.click();
    await expect(page).toHaveURL(/\/dopamine$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dopamine: One Molecule, Every MCAT Section");
  });

  await step(page, 4, "answers the first question wrong and sees the right answer and why", "wrong-answer", async () => {
    const q1 = page.locator("li", { has: page.getByText("The rate-limiting enzyme in dopamine synthesis is:") });
    await q1.scrollIntoViewIfNeeded();
    await q1.getByRole("button", { name: /DOPA decarboxylase/ }).click();
    await expect(q1.getByRole("status")).toContainText("Not quite. The answer is B.");
    await expect(q1.getByRole("status")).toContainText("Tyrosine hydroxylase converts tyrosine to L-DOPA");
  });

  await step(page, 5, "answers the next question right", "right-answer", async () => {
    const q2 = page.locator("li", { has: page.getByText("Parkinson's patients are given L-DOPA instead of dopamine because:") });
    await q2.scrollIntoViewIfNeeded();
    await q2.getByRole("button", { name: /cannot cross the blood–brain barrier/ }).click();
    await expect(q2.getByRole("status")).toContainText("Correct.");
  });

  await step(page, 6, "opens booking from the lesson and sees the Calendly embed (stubbed)", "booking", async () => {
    // "Want to go deeper? Book a free consult call." at the end of the lesson.
    await page.getByRole("link", { name: "Book a free consult call" }).last().click();
    // The lesson is MCAT, so booking opens on the MCAT tab.
    await expect(page).toHaveURL(/\/book\?service=mcat$/);
    await expect(page.getByRole("tab", { name: "MCAT" })).toHaveAttribute("aria-selected", "true");
    await expectBooking(page, "15min");
    if (!LIVE) await expect(page.frameLocator('iframe[title^="Schedule a free consultation"]').getByRole("heading", { name: "Calendly (stub)" })).toBeVisible();
    // Frame the embed below the page heading for the evidence shot.
    await frameBooking(page);
  });

  expect(errors, "no uncaught page errors").toEqual([]);
});

test("journey: admissions visitor: home → admissions → credentials → pricing → booking", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title><main><h1>Calendly (stub)</h1><p>Admissions</p></main>" }));

  await step(page, "A1", "opens the homepage and chooses College Admissions", "admissions-home", async () => {
    await page.goto("/");
    const explore = page.getByRole("link", { name: "Explore Admissions Consulting" }).first();
    await explore.scrollIntoViewIfNeeded();
    await explore.click();
    await expect(page).toHaveURL(/\/admissions$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("College admissions help, from someone who went through it recently.");
    await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeInViewport();
  });

  await step(page, "A2", "sees the credentials: schools and high school record", "admissions-credentials", async () => {
    const tiles = page.getByRole("list", { name: "Admitted to" });
    for (const s of ["MIT", "Yale", "Columbia", "Brown", "Dartmouth", "Penn"]) await expect(tiles.getByRole("listitem").filter({ hasText: new RegExp(`^${s}`) })).toBeVisible();
    await expect(tiles.getByText("Benjamin Franklin Scholar")).toBeVisible();
    for (const v of ["4.00/4.00", "1550", "35", "40/45"]) await expect(page.getByText(v, { exact: true }).first()).toBeVisible();
    await page.locator("#record").scrollIntoViewIfNeeded();
    await expect(page.getByRole("figure", { name: /IB Diploma/ })).toBeVisible();
  });

  await step(page, "A3", "reads admissions pricing (blank prices are honest)", "admissions-pricing", async () => {
    const pricing = page.locator("#admissions-pricing");
    await pricing.scrollIntoViewIfNeeded();
    await expect(pricing.getByText("Priced on your consult call")).toHaveCount(3);
    await expect(pricing.getByText("Payment via Zelle after the consult call. No card checkout.", { exact: false })).toBeVisible();
  });

  await step(page, "A4", "books with the College Admissions toggle selected", "admissions-booking", async () => {
    await page.getByRole("link", { name: "Book a free consult call" }).last().click();
    await expect(page).toHaveURL(/\/book\?service=admissions$/);
    await expect(page.getByRole("tab", { name: "College Admissions" })).toHaveAttribute("aria-selected", "true");
    await expectBooking(page, "admissions-15min");
    await page.getByRole("tab", { name: "MCAT" }).click();
    await expectBooking(page, "15min");
    await page.getByRole("tab", { name: "College Admissions" }).click();
    await frameBooking(page);
  });

  expect(errors, "no uncaught page errors").toEqual([]);
});
