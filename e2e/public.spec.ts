import { expect, test } from "@playwright/test";

test("1. homepage loads with founder facts and no errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Study with Shabari/);
  // Founder spec: headline, two equal panels with their buttons, the booking call, the credibility strip.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("I scored a 522 on the MCAT and got into MIT and 5 Ivies. Now I teach both.");
  await expect(page.getByText("522 MCAT — 132 B/B, 132 P/S, 131 C/P")).toBeVisible();
  await expect(page.getByText("Admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn (Benjamin Franklin Scholar)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore MCAT Prep" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Admissions Consulting" }).first()).toBeVisible();
  for (const c of ["Eloranta Fellow", "Legatum Fellow", "Burchard Scholar", "BMJ Rapid Responses", "MIT TA"]) {
    await expect(page.getByRole("list", { name: "Credentials" }).getByText(c, { exact: true })).toBeVisible();
  }

  // The MCAT half carries the 522 instrument, MCAT pricing and the dopamine readings with measured values.
  await page.goto("/mcat");
  await expect(page.getByRole("figure", { name: /MCAT total score 522 out of 528/ })).toBeVisible();
  await expect(page.getByText("$2,000")).toBeAttached();
  for (const t of ["Chem/Phys", "Bio/Biochem", "Psych/Soc"]) await expect(page.getByRole("tab", { name: t })).toBeVisible();
  await expect(page.getByText("1.395 Å").first()).toBeVisible();
  await page.getByRole("tab", { name: "Bio/Biochem" }).click();
  await expect(page.getByRole("heading", { name: "Read it as a biochemist" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("2. main navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  // The spec's navigation, in order.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveText([
    "MCAT Prep",
    "College Admissions",
    "Free Practice Test",
    "Free Notes",
    "Research & Teaching",
    "Pricing",
    "About",
  ]);
  for (const [link, heading] of [
    ["MCAT Prep", /Learn the MCAT from someone who teaches this material at MIT/],
    ["College Admissions", /I got into MIT and 5 of 8 Ivies/],
    ["Free Practice Test", /test day/],
    ["Free Notes", /My complete MCAT notes/],
    ["Research & Teaching", /Immunology, computational genomics/],
    ["Pricing", /Every option starts with a free 15-minute call/],
    ["About", /Hi, I’m Shabari/],
  ] as const) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  await page.getByRole("link", { name: "Book a Call", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Book a free 15-minute call");
  // The old tutoring URL lands on the MCAT half.
  await page.goto("/mcat-tutoring");
  await expect(page).toHaveURL(/\/mcat$/);
  for (const path of ["/faq", "/testimonials", "/contact", "/privacy", "/terms"]) {
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

test("only the site's own domains may be indexed: any other host is sent X-Robots-Tag: noindex", async ({ request }) => {
  // The production build also answers on its *.vercel.app URL, where robots.txt follows VERCEL_ENV and allows crawling.
  for (const path of ["/", "/robots.txt", "/practice", "/lessons/no-such-lesson"]) {
    const vercel = await request.get(path, { headers: { host: "study-with-shabari.vercel.app" }, maxRedirects: 0 });
    expect(vercel.headers()["x-robots-tag"], path).toBe("noindex");
    const canonical = await request.get(path, { headers: { host: "studywithshabari.com" }, maxRedirects: 0 });
    expect(canonical.headers()["x-robots-tag"], path).toBeUndefined();
  }
  // Served as usual, not redirected: until the DNS cutover the vercel.app URL is how the site is reached.
  const home = await request.get("/", { headers: { host: "study-with-shabari.vercel.app" }, maxRedirects: 0 });
  expect(home.status()).toBe(200);
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
