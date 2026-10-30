import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { choose, finishLesson, lessonKey } from "./helpers";

// The vertical slice (docs/PRODUCT-DIRECTION.md, Amendment 1): a new visitor on a
// phone arrives, sees why Shabari is credible, learns something real, gets one
// wrong, understands why, gets the retest right, sees an honest result, and books.
// Runs on the production build against the throwaway E2E database, where
// scripts/e2e-server.sh has approved the dopamine lesson's AI drafts.

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

const next = (page: Page, name: RegExp | string) => page.getByRole("link", { name }).click();

async function answer(page: Page, label: string, confidence: "Sure" | "Unsure" | "Guessing") {
  await choose(page, label);
  await page.locator("label", { hasText: new RegExp(`^${confidence}$`) }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal")).toBeVisible();
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));
test.afterAll(() => {
  writeFileSync(path.join(SHOTS, "report.json"), JSON.stringify({ ranAt: new Date().toISOString(), device: "iPhone 14 (Chromium emulation)", build: "next build + next start", results }, null, 2));
});

test("journey: homepage → credentials → lesson → miss, diagnose, retest → result → booking", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title><main><h1>Calendly (stub)</h1><p>Pick a time</p></main>" }));

  await step(page, 1, "opens the homepage", "home", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("MCAT tutoring and college admissions help, from someone who recently went through both.");
    // Book and practice are both on the first screen of a phone.
    await expect(page.getByRole("link", { name: "Book a free 15-min call" }).first()).toBeInViewport();
    await expect(page.getByRole("link", { name: "Explore MCAT tutoring" }).first()).toBeInViewport();
  });

  await step(page, 2, "credentials (522, MIT, majors) are in the first two screens", "credentials", async () => {
    const screens = 2 * page.viewportSize()!.height;
    for (const text of ["522", "MIT", "Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)"]) {
      expect(await firstTop(page, text), `"${text}" within the first two screens`).toBeLessThan(screens);
    }
  });

  await step(page, 3, "goes to MCAT Prep and starts the dopamine lesson", "lesson-teach", async () => {
    await page.getByRole("link", { name: "Explore MCAT Prep" }).first().click();
    await expect(page).toHaveURL(/\/mcat$/);
    const start = page.getByRole("link", { name: "Start the free lesson" });
    await start.scrollIntoViewIfNeeded();
    await start.click();
    await expect(page.getByRole("heading", { level: 1, name: "Dopamine, read three ways" })).toBeVisible();
    // Published, approved content: no draft badge, an honest AI note, nothing attributed to Shabari.
    if (LIVE && (await page.getByTestId("draft-badge").count()) > 0) {
      // A protected preview showing the unapproved draft says so plainly.
      await expect(page.getByText(/drafted with AI and haven.t been reviewed yet/)).toBeVisible();
    } else {
      await expect(page.getByTestId("draft-badge")).toHaveCount(0);
      await expect(page.getByText("Questions and explanations drafted with AI, then reviewed before publishing.")).toBeVisible();
    }
    await expect(page.getByText(/Shabari[’']s explanation/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Start the lesson" }).click();
    await expect(page.getByTestId("step-count")).toHaveText("Step 1 of 13");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The amine's charge at body pH");
  });

  await step(page, 4, "answers the first question wrong on purpose, rating confidence first", "wrong-answer", async () => {
    await next(page, "Continue");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Question 1 of 7");
    // Checking without a confidence rating is refused: the rating comes before the reveal.
    await choose(page, "A");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Rate how sure you are before you check.")).toBeVisible();
    await expect(page.getByTestId("reveal")).toHaveCount(0);
    await page.locator("label", { hasText: /^Sure$/ }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByTestId("reveal-verdict")).toHaveText("Not quite.");
    await expect(page.getByText("You chose A and said you were sure. The answer is C.")).toBeVisible();
  });

  await step(page, 5, "the explanation names the misconception and the next step remediates it", "misconception-remediation", async () => {
    await expect(page.getByTestId("misconception-name")).toHaveText("Treats the amine as neutral at physiological pH");
    await expect(page.getByRole("heading", { name: "Why A is wrong" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Why C is right" })).toBeVisible();
    await next(page, "Continue");
    await expect(page.getByTestId("remediation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Treats the amine as neutral at physiological pH");
    await expect(page.getByTestId("remediation-text")).toContainText("Compare the pH with the pKa first.");
  });

  await step(page, 6, "answers the retest on the same idea correctly", "retest-correct", async () => {
    await next(page, "Try the retest");
    await expect(page.getByText("Chem/Phys retest: the same idea, a new question")).toBeVisible();
    await answer(page, "C", "Unsure");
    await expect(page.getByTestId("reveal-verdict")).toHaveText("Correct.");
  });

  await step(page, 7, "finishes the lesson; the result compares first try with retest", "result", async () => {
    // The rest of the lesson: right answers, confident throughout.
    await finishLesson(page, lessonKey().slice(2), "Sure");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What this lesson showed");
    const row = page.locator('[data-testid="result-row"][data-concept="protonation"]');
    await expect(row.getByTestId("first")).toHaveAttribute("data-correct", "false");
    await expect(row.getByTestId("first")).toContainText("Wrong (A), sure");
    await expect(row.getByTestId("retest")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("misconceptions-hit")).toContainText("Treats the amine as neutral at physiological pH");
    await expect(page.getByTestId("sure-wrong")).toContainText("The amine's charge at body pH");
    // Honest: no percentages or score predictions from seven questions.
    await expect(page.locator("main")).not.toContainText("%");
    await row.scrollIntoViewIfNeeded();
  });

  await step(page, 8, "opens booking and sees the Calendly embed (stubbed)", "booking", async () => {
    await page.getByRole("link", { name: "Book a free 15-min call" }).first().click();
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
    await expect(page.getByRole("link", { name: "Book a free 15-min call" }).first()).toBeInViewport();
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
    await expect(pricing.getByText("Payment via Zelle. Details are sent after your consult call.", { exact: false })).toBeVisible();
  });

  await step(page, "A4", "books with the College Admissions toggle selected", "admissions-booking", async () => {
    await page.getByRole("link", { name: "Book a free 15-min call" }).last().click();
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
