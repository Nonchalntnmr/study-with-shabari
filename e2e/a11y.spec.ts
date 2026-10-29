import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { answerKey, startSet, submitFromReview, answerAll } from "./helpers";

// WCAG 2.1 A/AA checks with axe-core on the pages students use most.
const scan = (page: import("@playwright/test").Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

for (const path of ["/", "/practice", "/practice/cp-sample-set-1", "/pricing", "/contact", "/book", "/login", "/signup", "/about", "/faq"]) {
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
