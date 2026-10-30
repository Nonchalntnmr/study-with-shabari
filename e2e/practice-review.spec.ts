import { expect, test } from "@playwright/test";

// Founder decisions 2026-10-30: a set published before Shabari's review is labelled "Practice set, being
// reviewed by Shabari." with a link to report an error (05:13). She has since reviewed FL1 (05:56), so FL1
// carries no label. scripts/e2e-server.sh imports FL1 the way production has it, and marks one sample set
// as still under review so the label stays covered.
const LABEL = "Practice set, being reviewed by Shabari.";
// The founder's rule for FL1: never official, calibrated or representative of the real exam.
const OVERCLAIM = /\bcalibrated\b|\brepresentative of\b|\bofficial (MCAT|practice|exam|full-length)\b|matching the real MCAT|real MCAT's (content mix|difficulty)/i;

test("FL1, reviewed by Shabari, is published without the review label, and nothing overclaims it", async ({ page }) => {
  await page.goto("/practice");
  for (const name of [/FL1: Chem\/Phys/, /FL1: Bio\/Biochem/, /FL1: Psych\/Soc/]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("link", { name })).not.toContainText(LABEL);
  }
  await expect(page.locator("main")).not.toContainText(OVERCLAIM);

  await page.goto("/practice/fl1-cp");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("FL1: Chem/Phys");
  await expect(page.locator("main")).not.toContainText(LABEL);
  await expect(page.locator("main")).not.toContainText(OVERCLAIM);

  await page.goto("/mcat");
  await expect(page.getByText("Available now: a full-length practice test (C/P, B/B and P/S).")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("being reviewed by Shabari");
  await expect(page.locator("main")).not.toContainText(OVERCLAIM);
});

test("a set still under review is labelled, with a way to report an error, on the practice page and the test intro", async ({ page }) => {
  await page.goto("/practice");
  const notice = page.getByRole("note").filter({ hasText: LABEL });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "Report an error" })).toHaveAttribute("href", "/contact?topic=support");
  await expect(page.getByRole("link", { name: /Psych\/Soc sample set 1/i })).toContainText(LABEL);
  // A reviewed set isn't labelled.
  await expect(page.getByRole("link", { name: /Chem\/Phys sample set 1/i }).first()).not.toContainText(LABEL);
  await expect(page.locator("main")).not.toContainText(/I wrote|written by Shabari|verified by Shabari/i);

  await page.goto("/practice/ps-sample-set-1");
  await expect(page.getByRole("note").filter({ hasText: LABEL }).getByRole("link", { name: "Report an error" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/I wrote|written by Shabari|verified by Shabari/i);
});

test("FL1's first passage shows its figure description as a caption box under the passage", async ({ page }) => {
  await page.goto("/practice/fl1-cp");
  await page.getByRole("button", { name: /Start practice set/ }).click();
  await expect(page).toHaveURL(/\/exam\//);
  await expect(page.getByTestId("passage-figure-text")).toContainText("Table 1: [S] (mM) vs v0");
});
