import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { answerKey, startSet, submitFromReview, answerAll, choose, finishLesson, lessonKey } from "./helpers";

// WCAG 2.1 A/AA checks with axe-core on the pages students use most.
const scan = (page: import("@playwright/test").Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

for (const path of ["/", "/mcat", "/dopamine", "/admissions", "/research", "/lessons/dopamine", "/practice", "/practice/cp-sample-set-1", "/pricing", "/contact", "/book", "/login", "/signup", "/about", "/faq"]) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title><main>stub</main>" }));
    await page.goto(path);
    const { violations } = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });
}

test("a11y: exam runner and results", async ({ page }) => {
  await startSet(page, "cp-sample-set-1", "Untimed");
  expect((await scan(page)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  const key = answerKey("cp-sample-set-1");
  await answerAll(page, 8, (i) => key[i]);
  expect((await scan(page)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await submitFromReview(page);
  expect((await scan(page)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("a11y: lesson teach, question, reveal, remediation and result", async ({ page }) => {
  const violations = async () => (await scan(page)).violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
  await page.goto("/lessons/dopamine");
  await page.getByRole("button", { name: "Start the lesson" }).click();
  await expect(page.getByTestId("step-count")).toHaveText("Step 1 of 13");
  expect(await violations()).toEqual([]);
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Check answer" })).toBeVisible();
  expect(await violations()).toEqual([]);
  await choose(page, "A");
  await page.locator("label", { hasText: /^Sure$/ }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal")).toBeVisible();
  expect(await violations()).toEqual([]);
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByTestId("remediation")).toBeVisible();
  expect(await violations()).toEqual([]);

  await finishLesson(page, lessonKey().slice(1), "Unsure");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What this lesson showed");
  expect(await violations()).toEqual([]);
});
