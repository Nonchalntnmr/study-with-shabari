import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { answerKey, choose, signUp, sql, startSet, submitFromReview, uniqueEmail, waitSaved } from "./helpers";

// The free-practice journey from the M2 brief, as a guest and as a registered
// student, on the production build and the throwaway database. One screenshot
// per guest step goes to ~/projects/study-with-shabari/.local/shots/m2/journey/.

const SHOTS = process.env.M2_SHOTS_DIR ?? path.join(homedir(), "projects/study-with-shabari/.local/shots/m2/journey");
const SLUG = "bb-sample-set-1";
const key = answerKey(SLUG);
const N = key.length;
const results: { step: number; name: string; status: string; ms: number; error?: string }[] = [];

async function step(page: Page, n: number, name: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  await test.step(`${n}. ${name}`, async () => {
    try {
      await fn();
      await page.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`), fullPage: false });
      results.push({ step: n, name, status: "passed", ms: Date.now() - t0 });
    } catch (e) {
      results.push({ step: n, name, status: "failed", ms: Date.now() - t0, error: e instanceof Error ? e.message.split("\n")[0] : String(e) });
      throw e;
    }
  });
}

// Next keeps the previous page mounted but hidden after client navigation, so match visible elements only.
const shown = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

const wrongFor = (i: number) => ["A", "B", "C", "D"].find((l) => l !== key[i])!;

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));
test.afterAll(() => writeFileSync(path.join(SHOTS, "report.json"), JSON.stringify({ ranAt: new Date().toISOString(), build: "next build + next start", results }, null, 2)));

test("guest practice journey: start, answer, refresh, restore, finish, accurate review, retest, booking", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title><h1>Calendly (stub)</h1>" }));
  let attemptUrl = "";

  await step(page, 1, "guest starts a free practice set", async () => {
    await page.goto("/practice");
    await page.getByRole("link", { name: /Bio\/Biochem sample set/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/practice/${SLUG}$`));
    await page.getByLabel(/^Timed/).check();
    await page.getByRole("button", { name: "Start practice set" }).click();
    await expect(page).toHaveURL(/\/exam\/[a-z0-9]+$/);
    await expect(page.getByText(`Question 1 of ${N}`)).toBeVisible();
    attemptUrl = page.url();
  });

  await step(page, 2, "guest answers questions and refreshes", async () => {
    // Q1 wrong on purpose, Q2 right and flagged, Q3 right; then reload mid-set.
    await choose(page, wrongFor(0));
    await page.getByRole("button", { name: "Next" }).click();
    await choose(page, key[1]);
    await page.getByRole("button", { name: "Flag for review" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await choose(page, key[2]);
    await waitSaved(page);
    await page.reload();
  });

  await step(page, 3, "progress is restored exactly", async () => {
    await expect(page.getByText(`Question 3 of ${N}`)).toBeVisible();
    await expect(page.getByRole("radio", { name: new RegExp(`^${key[2]}\\. `) })).toBeChecked();
    await page.getByRole("button", { name: "Navigator" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Question 1, answered" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Question 2, answered, flagged" })).toBeVisible();
    await expect(dialog.getByText("3 answered")).toBeVisible();
    await dialog.getByRole("button", { name: /Question 4,/ }).click();
  });

  await step(page, 4, "guest completes the set", async () => {
    for (let i = 3; i < N; i++) {
      await expect(page.getByText(`Question ${i + 1} of ${N}`)).toBeVisible();
      // Leave the last one wrong too, so there are two misses to retest.
      await choose(page, i === N - 1 ? wrongFor(i) : key[i]);
      await page.getByRole("button", { name: i === N - 1 ? "Review answers" : "Next" }).click();
    }
    await expect(page.getByText(`${N} of ${N} answered`)).toBeVisible();
    await submitFromReview(page);
  });

  await step(page, 5, "results and explanations are accurate", async () => {
    await expect(shown(page, "score")).toHaveText(`${N - 2}/${N}`);
    await expect(page.getByText("not an MCAT scaled score")).toBeVisible();
    const first = shown(page, "result-item").first();
    await expect(first).toContainText("Incorrect");
    await expect(first).toContainText("Correct answer");
    await expect(first).toContainText("Your answer");
    await expect(first.getByText("Explanation")).toBeVisible();
    // Every choice explains itself.
    const rationales = await first.locator("li p.text-muted-foreground").count();
    expect(rationales).toBe(4);
    const [row] = await sql<{ correct: number }>(`SELECT "correctCount" AS correct FROM "Attempt" WHERE id = $1`, [attemptUrl.split("/").pop()]);
    expect(row.correct).toBe(N - 2);
  });

  await step(page, 6, "guest reviews mistakes", async () => {
    await page.getByRole("button", { name: "Missed", exact: true }).click();
    await expect(shown(page, "result-item")).toHaveCount(2);
    await expect(shown(page, "result-item").first()).toContainText("Question 1");
  });

  await step(page, 7, "guest retests the missed concepts", async () => {
    await page.getByRole("button", { name: "Retest the 2 you missed" }).click();
    await expect(page).toHaveURL(/\/exam\/[a-z0-9]+$/);
    await expect(page.getByText("(retest of your misses)")).toBeVisible();
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
    await choose(page, key[0]);
    await page.getByRole("button", { name: "Next" }).click();
    await choose(page, key[N - 1]);
    await page.getByRole("button", { name: "Review answers" }).click();
    await submitFromReview(page);
    await expect(shown(page, "score")).toHaveText("2/2");
    await expect(shown(page, "retest-of")).toContainText(`${N - 2} of ${N} right`);
    await page.getByRole("link", { name: "See the original" }).click();
    await expect(shown(page, "retest-history")).toContainText("2 of 2 right");
  });

  await step(page, 8, "guest reaches the booking page", async () => {
    await page.goto("/book");
    await expect(page.locator('iframe[title^="Schedule a free consultation"]')).toHaveAttribute("src", /^https:\/\/calendly\.com\//);
  });

  expect(errors).toEqual([]);
});

test("registered student: practice, retest and history are kept on the account", async ({ page }) => {
  const email = uniqueEmail("m2-student");
  await signUp(page, email);
  await startSet(page, "cp-sample-set-1", "Untimed");
  const k = answerKey("cp-sample-set-1");
  for (let i = 0; i < k.length; i++) {
    await choose(page, i === 0 ? ["A", "B", "C", "D"].find((l) => l !== k[0])! : k[i]);
    await page.getByRole("button", { name: i === k.length - 1 ? "Review answers" : "Next" }).click();
  }
  await submitFromReview(page);
  await page.getByRole("button", { name: "Retest the 1 you missed" }).click();
  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  await choose(page, k[0]);
  await page.getByRole("button", { name: "Review answers" }).click();
  await submitFromReview(page);
  const rows = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM "Attempt" a JOIN "User" u ON u.id = a."userId" WHERE u.email = $1 AND a.status = 'SUBMITTED'`, [email]);
  expect(rows[0].n).toBe(2);
  await page.goto("/dashboard/history");
  await expect(page.getByText(/Chem\/Phys sample set/i).first()).toBeVisible();
});
