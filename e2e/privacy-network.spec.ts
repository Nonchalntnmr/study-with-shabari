import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Evidence for docs/PRIVACY-REVIEW.md: every host the browser contacts on each
// public page, and the cookies a visit leaves behind. Fonts are self-hosted
// (next/font), so the only third party expected is Calendly, and only on /book.

const PAGES = [
  "/",
  "/lessons/dopamine",
  "/practice",
  "/practice/cp-sample-set-1",
  "/resources",
  "/mcat",
  "/research",
  "/admissions",
  "/pricing",
  "/about",
  "/testimonials",
  "/faq",
  "/contact",
  "/book",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
];

test("privacy: third-party hosts and cookies per public page", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const own = new URL(baseURL!).host;
  const report: Record<string, { thirdParty: string[]; cookies: string[] }> = {};
  // Calendly is stubbed so the test stays hermetic; the request to its host is still recorded.
  await page.route("https://calendly.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Calendly</title>" }));

  for (const path of PAGES) {
    const hosts = new Set<string>();
    const onRequest = (req: { url: () => string }) => {
      const u = new URL(req.url());
      if (u.protocol.startsWith("http") && u.host !== own) hosts.add(u.host);
    };
    page.on("request", onRequest);
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    page.off("request", onRequest);
    report[path] = { thirdParty: [...hosts].sort(), cookies: (await context.cookies()).map((c) => c.name) };
  }

  // Starting a lesson is the first thing that sets a cookie: the guest key, so answers can resume.
  await page.goto("/lessons/dopamine");
  await page.getByRole("button", { name: "Start the lesson" }).click();
  await expect(page).toHaveURL(/\/a\//);
  const afterStart = await context.cookies();
  report["(after starting the lesson)"] = { thirdParty: [], cookies: afterStart.map((c) => `${c.name} (httpOnly=${c.httpOnly}, sameSite=${c.sameSite})`) };

  mkdirSync(".local/privacy", { recursive: true });
  writeFileSync(".local/privacy/network-report.json", JSON.stringify({ ranAt: new Date().toISOString(), baseURL, report }, null, 2));

  for (const [path, r] of Object.entries(report)) {
    if (path.startsWith("(")) continue;
    expect(r.thirdParty, path).toEqual(path === "/book" ? ["calendly.com"] : []);
    expect(r.cookies, `${path} sets no cookies on a plain visit`).toEqual([]);
  }
  expect(afterStart.map((c) => c.name)).toEqual(["sws_guest"]);
  expect(afterStart[0]).toMatchObject({ httpOnly: true, sameSite: "Lax" });
});
