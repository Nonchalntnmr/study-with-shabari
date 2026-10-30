import { expect, test, type Page } from "@playwright/test";
import { ADMIN, signIn } from "./helpers";

// The Content-Security-Policy (src/lib/csp.ts) must not block anything the site itself does.
// Every securitypolicyviolation event raised in our document is recorded, along with Chromium's
// "Refused to ..." console errors, and none may occur. Violations inside Calendly's frame are
// Calendly's own policy and don't reach this document.

async function recordViolations(page: Page) {
  const logged: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) logged.push(m.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.effectiveDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber}) ${e.sample}`));
  });
  return async (where: string) => {
    const events = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    expect([...events, ...logged], where).toEqual([]);
  };
}

test.beforeEach(async ({ page }) => {
  // A stand-in for Calendly, served from the real origin so frame-src is exercised; keeps the test hermetic.
  await page.route("https://calendly.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Calendly</title><p>Pick a time</p>" }));
});

test("no CSP violations on the public pages and both booking tabs", async ({ page }) => {
  const check = await recordViolations(page);
  for (const path of ["/", "/mcat", "/login"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await check(path);
  }

  await page.goto("/book");
  const frame = page.frameLocator('iframe[title^="Schedule a free consultation"]');
  await expect(frame.getByText("Pick a time")).toBeVisible();
  await check("/book (MCAT)");
  await page.getByRole("tab", { name: "College Admissions" }).click();
  await expect(page.getByRole("tab", { name: "College Admissions" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('iframe[title^="Schedule a free consultation"]')).toHaveAttribute("src", /admissions-15min/);
  await expect(frame.getByText("Pick a time")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await check("/book (College Admissions)");
});

test("no CSP violations in the admin area", async ({ page }) => {
  const check = await recordViolations(page);
  await signIn(page, ADMIN.email, ADMIN.password);
  for (const path of ["/admin", "/admin/lessons", "/admin/content"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await check(path);
  }
});
