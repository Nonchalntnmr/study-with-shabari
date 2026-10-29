import { expect, test } from "@playwright/test";

test("1. homepage loads with founder facts and no errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Study with Shabari/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("MCAT tutoring from a 522 scorer.");
  await expect(page.getByRole("figure", { name: /MCAT total score 522 out of 528/ })).toBeAttached();
  await expect(page.getByText("$2,000")).toBeAttached();
  // The three readings of the molecule, with values measured from the PubChem conformer.
  for (const h of ["a chemist.", "a biochemist.", "a psychologist."]) await expect(page.getByRole("heading", { name: new RegExp(`Read it as ${h}`) })).toBeAttached();
  await expect(page.getByText("1.395 Å").first()).toBeAttached();
  expect(errors).toEqual([]);
});

test("2. main navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  for (const [navName, link, heading] of [
    ["Main", "Tutoring", /science sections/],
    ["Main", "Practice", /test day/],
    ["Main", "Notes", /study notes/],
    ["More", "Pricing", /Simple pricing/],
    ["More", "About", /Hi, I’m Shabari/],
    ["More", "Book a call", /Book a free 15-minute call/],
  ] as const) {
    await page.getByRole("navigation", { name: navName }).getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  for (const path of ["/admissions", "/faq", "/testimonials", "/contact", "/privacy", "/terms"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});

test("13. resource links: notes show honest placeholders, practice links work", async ({ page }) => {
  await page.goto("/resources");
  await expect(page.getByText("Link coming soon")).toHaveCount(3);
  const practiceLinks = page.getByRole("link", { name: "Start practice" });
  await expect(practiceLinks).toHaveCount(3);
  const href = await practiceLinks.first().getAttribute("href");
  const res = await page.goto(href!);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Start practice set" })).toBeVisible();
});

test("14. booking embed loads when configured and only Calendly can confirm a booking", async ({ page }) => {
  // Stand in for Calendly so the test is hermetic; the stub is served from the real Calendly origin.
  await page.route("https://calendly.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<button id="book" onclick="parent.postMessage({event:'calendly.event_scheduled',payload:{}},'*')">Confirm</button>`,
    }),
  );
  await page.goto("/book");
  const frame = page.locator('iframe[title^="Schedule a free consultation"]');
  await expect(frame).toHaveAttribute("src", /^https:\/\/calendly\.com\/e2e-shabari\/15min\?.*embed_domain=localhost/);

  // A message from any other origin is ignored.
  await page.evaluate(() => window.postMessage({ event: "calendly.event_scheduled" }, "*"));
  await page.waitForTimeout(300);
  await expect(page.getByText("Calendly confirmed your booking")).toHaveCount(0);

  await page.frameLocator('iframe[title^="Schedule a free consultation"]').locator("#book").click();
  await expect(page.getByText("Calendly confirmed your booking")).toBeVisible();
});

test("15 (local). secondary domains redirect permanently to the canonical site", async ({ request }) => {
  const cases: [string, string, string][] = [
    ["www.studywithshabari.com", "/practice?x=1", "https://studywithshabari.com/practice?x=1"],
    ["studywithshabari.org", "/about", "https://studywithshabari.com/about"],
    ["studywithshabari.info", "/anything", "https://studywithshabari.com/resources"],
    ["studywithshabari.store", "/", "https://studywithshabari.com/pricing"],
  ];
  for (const [host, path, target] of cases) {
    const res = await request.get(path, { headers: { "x-forwarded-host": host }, maxRedirects: 0 });
    expect(res.status(), host).toBe(308);
    expect(res.headers()["location"], host).toBe(target);
  }
  const canonical = await request.get("/", { headers: { "x-forwarded-host": "studywithshabari.com" }, maxRedirects: 0 });
  expect(canonical.status()).toBe(200);
});

test("security headers, robots and sitemap", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
  // Not a production deployment, so nothing may be indexed.
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://studywithshabari.com/practice/cp-sample-set-1</loc>");
  const health = await (await request.get("/api/health")).json();
  expect(health).toMatchObject({ ok: true, db: "up" });
});
