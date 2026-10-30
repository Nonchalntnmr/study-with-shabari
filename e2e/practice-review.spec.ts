import { expect, test } from "@playwright/test";

// Founder decision 2026-10-30: FL1 is published before Shabari's review, so the practice page and
// the test intro label it "Practice set, being reviewed by Shabari." with a link to report an error,
// and nothing describes the questions as written or verified by her. scripts/e2e-server.sh imports
// FL1 the way production has it.
const LABEL = "Practice set, being reviewed by Shabari.";

test("FL1 is labelled as being reviewed, with a way to report an error, on the practice page and the test intro", async ({ page }) => {
  await page.goto("/practice");
  const notice = page.getByRole("note").filter({ hasText: LABEL });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "Report an error" })).toHaveAttribute("href", "/contact?topic=support");
  await expect(page.getByRole("link", { name: /FL1: Chem\/Phys/ })).toContainText(LABEL);
  // A reviewed set isn't labelled.
  await expect(page.getByRole("link", { name: /Chem\/Phys sample set 1/i }).first()).not.toContainText(LABEL);
  await expect(page.locator("main")).not.toContainText(/I wrote|written by Shabari|verified by Shabari/i);

  await page.goto("/practice/fl1-cp");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("FL1: Chem/Phys");
  await expect(page.getByRole("note").filter({ hasText: LABEL }).getByRole("link", { name: "Report an error" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/I wrote|written by Shabari|verified by Shabari/i);
});

test("FL1's first passage shows its figure description as a caption box under the passage", async ({ page }) => {
  await page.goto("/practice/fl1-cp");
  await page.getByRole("button", { name: /Start practice set/ }).click();
  await expect(page).toHaveURL(/\/exam\//);
  await expect(page.getByTestId("passage-figure-text")).toContainText("Table 1: [S] (mM) vs v0");
});
