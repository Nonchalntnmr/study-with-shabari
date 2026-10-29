import { expect, test } from "@playwright/test";
import { answerKey, choose, sql, startSet, submitFromReview, waitSaved } from "./helpers";

const SLUG = "cp-sample-set-1";
const key = answerKey(SLUG);

test("3-9. guest takes a timed set: answer, strike, flag, highlight, timer, reload, submit, accurate results", async ({ page }) => {
  await startSet(page, SLUG, "Timed");

  // 5. timer counts down from the server deadline
  const clock = page.getByTestId("exam-clock");
  const t1 = (await clock.textContent())!;
  expect(t1).toMatch(/1[23]:\d\d/);
  await page.waitForTimeout(2200);
  expect(await clock.textContent()).not.toBe(t1);

  // 4. select answers; strike one choice; flag; highlight passage text
  const wrong = ["A", "B", "C", "D"].find((l) => l !== key[0])!;
  await page.getByRole("button", { name: `Strike out choice ${wrong}` }).click();
  await expect(page.getByRole("button", { name: `Restore choice ${wrong}` })).toHaveAttribute("aria-pressed", "true");
  await choose(page, key[0]);
  await page.getByRole("button", { name: "Flag for review" }).click();
  await page.evaluate(() => {
    const p = document.querySelector('[data-passage-text] [data-p="0"]')!;
    const r = document.createRange();
    r.setStart(p.firstChild!.firstChild!, 0);
    r.setEnd(p.firstChild!.firstChild!, 20);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.locator("[data-passage-text] mark.exam-hl")).toHaveText("Blood plasma is held");
  await waitSaved(page);

  // 6. everything survives a reload
  const url = page.url();
  await page.reload();
  await expect(page.getByText("Question 1 of 8")).toBeVisible();
  await expect(page.getByRole("radio", { name: new RegExp(`^${key[0]}\\. `) })).toBeChecked();
  await expect(page.getByRole("button", { name: "Flagged" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: `Restore choice ${wrong}` })).toBeVisible();
  await expect(page.locator("[data-passage-text] mark.exam-hl")).toHaveText("Blood plasma is held");
  expect(page.url()).toBe(url);

  // Answer the rest: questions 2-4 right, 5-8 wrong, so the expected score is 4/8.
  for (let i = 1; i < 8; i++) {
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(`Question ${i + 1} of 8`)).toBeVisible();
    await choose(page, i < 4 ? key[i] : ["A", "B", "C", "D"].find((l) => l !== key[i])!);
  }
  await waitSaved(page);

  // Navigator shows status for every question.
  await page.getByRole("button", { name: /Navigator/ }).click();
  await expect(page.getByRole("button", { name: "Question 1, answered, flagged" })).toBeVisible();
  await page.keyboard.press("Escape");

  // 7. review screen, then a confirmation before submitting
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(page.getByText("8 of 8 answered · 1 flagged")).toBeVisible();
  await page.getByRole("button", { name: "Submit and see results" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("You’ve answered every question");
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep working" }).click();
  await submitFromReview(page);

  // 8. results are accurate; 9. explanations render
  await expect(page.getByTestId("score")).toHaveText("4/8");
  await expect(page.getByText("50% correct")).toBeVisible();
  await expect(page.getByText("not an MCAT scaled score")).toBeVisible();
  await expect(page.getByTestId("result-item")).toHaveCount(8);
  await expect(page.getByText("Explanation").first()).toBeVisible();
  await expect(page.getByText(/Henderson–Hasselbalch/).first()).toBeVisible();
  await page.getByRole("button", { name: "Missed", exact: true }).click();
  await expect(page.getByTestId("result-item")).toHaveCount(4);

  // The server agrees with the page.
  const attemptId = page.url().split("/").at(-2)!;
  const [row] = await sql<{ status: string; correctCount: number; totalCount: number }>(
    `SELECT status, "correctCount", "totalCount" FROM "Attempt" WHERE id = $1`,
    [attemptId],
  );
  expect(row).toEqual({ status: "SUBMITTED", correctCount: 4, totalCount: 8 });

  // A submitted attempt can't be reopened for editing.
  await page.goto(`/exam/${attemptId}`);
  await expect(page).toHaveURL(/\/results$/);
});

test("answers made offline are kept on the device and saved once back online", async ({ page, context }) => {
  await startSet(page, "bb-sample-set-1", "Untimed");
  await context.setOffline(true);
  await choose(page, "C");
  await expect(page.getByTestId("save-status")).toContainText("Offline", { timeout: 10_000 });
  await context.setOffline(false);
  await waitSaved(page);
  await page.reload();
  await expect(page.getByRole("radio", { name: /^C\. / })).toBeChecked();
});

test("time running out submits the attempt on the server's clock", async ({ page }) => {
  await startSet(page, "cp-sample-set-1", "Timed");
  await choose(page, answerKey("cp-sample-set-1")[0]);
  await waitSaved(page);
  const attemptId = page.url().split("/").at(-1)!;
  await sql(`UPDATE "Attempt" SET "deadlineAt" = now() + interval '4 seconds' WHERE id = $1`, [attemptId]);
  await page.reload();
  await expect(page).toHaveURL(/\/results$/, { timeout: 20_000 });
  await expect(page.getByText("submitted automatically when time ran out")).toBeVisible();
  await expect(page.getByTestId("score")).toHaveText("1/8");
});
