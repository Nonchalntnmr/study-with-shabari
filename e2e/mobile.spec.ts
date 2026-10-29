import { expect, test } from "@playwright/test";
import { choose, waitSaved } from "./helpers";

test("mobile: menu works and the exam switches between passage and question", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("test day");

  await page.goto("/practice/cp-sample-set-1");
  await page.getByRole("button", { name: "Start practice set" }).click();
  await expect(page.getByRole("region", { name: "Passage" })).toBeVisible();
  await page.getByRole("button", { name: "question", exact: true }).click();
  await choose(page, "B");
  await waitSaved(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
