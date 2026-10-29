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

const SHOTS = process.env.JOURNEY_SHOTS_DIR ?? path.join(homedir(), "projects/study-with-shabari/.local/shots/journey");
const results: { step: number; name: string; status: "passed" | "failed"; ms: number; error?: string }[] = [];

async function step(page: Page, n: number, name: string, shot: string, fn: () => Promise<void>) {
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/MCAT tutoring\s*from a 522 scorer\./);
    await expect(page.getByRole("link", { name: "Book a free 15-min call" }).first()).toBeInViewport();
  });

  await step(page, 2, "credentials (522, MIT, majors) are in the first two screens", "credentials", async () => {
    const screens = 2 * page.viewportSize()!.height;
    for (const text of ["522", "MIT", "Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)"]) {
      expect(await firstTop(page, text), `"${text}" within the first two screens`).toBeLessThan(screens);
    }
  });

  await step(page, 3, "starts the dopamine lesson from the homepage", "lesson-teach", async () => {
    const invite = page.getByRole("link", { name: "Start the dopamine lesson" });
    await invite.scrollIntoViewIfNeeded();
    await invite.click();
    await expect(page.getByRole("heading", { level: 1, name: "Dopamine, read three ways" })).toBeVisible();
    // Published, approved content: no draft badge, an honest AI note, nothing attributed to Shabari.
    await expect(page.getByTestId("draft-badge")).toHaveCount(0);
    await expect(page.getByText("Questions and explanations drafted with AI, then reviewed before publishing.")).toBeVisible();
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
    await expect(page).toHaveURL(/\/book$/);
    const frame = page.locator('iframe[title^="Schedule a free consultation"]');
    await expect(frame).toHaveAttribute("src", /^https:\/\/calendly\.com\/e2e-shabari\/15min\?/);
    await expect(page.frameLocator('iframe[title^="Schedule a free consultation"]').getByRole("heading", { name: "Calendly (stub)" })).toBeVisible();
    // Frame the embed below the page heading for the evidence shot.
    await page.evaluate(() => {
      const f = document.querySelector('iframe[title^="Schedule a free consultation"]')!;
      window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 260);
    });
  });

  expect(errors, "no uncaught page errors").toEqual([]);
});
