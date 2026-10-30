import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Checks against a real deployment:
//   SMOKE_BASE_URL=<deployment url> npx playwright test e2e/post-deploy.spec.ts
// Deployment checks run against any URL (a protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET).
// SMOKE_TARGET=production marks a production deployment reached by its *.vercel.app URL.
// Domain checks (HTTPS on the canonical host, the secondary-domain redirects) run only once
// SMOKE_BASE_URL is the canonical domain, i.e. after the DNS cutover.
// Nothing here writes to the database except one failed sign-in's rate-limit counter.
const base = new URL(process.env.SMOKE_BASE_URL ?? "https://studywithshabari.com");
const onCanonical = base.host === "studywithshabari.com";
const production = onCanonical || process.env.SMOKE_TARGET === "production";

const PAGES = ["/", "/mcat", "/admissions", "/research", "/practice", "/resources", "/pricing", "/about", "/testimonials", "/book", "/faq", "/contact", "/privacy", "/terms", "/login", "/signup"];

// The answer-key detector from answer-key.spec.ts, reduced to what a guest can fetch without
// starting an attempt: key fields in the HTML (which carries the RSC payload), and six-word phrases
// from the hidden explanations and rationales.
const KEY_FIELDS = /\\?"(isCorrect|rationale|explanation|correctChoiceId|correct)\\?"\s*:/;
const words = (s: string) =>
  s.replace(/&#x?[0-9a-f]+;|&[a-z]+;|\\u[0-9a-f]{4}|\\[nrt"]/gi, " ").replace(/[^A-Za-z]+/g, " ").trim().toLowerCase();
type Q = { stem: string; explanation: string; choices: { text: string; rationale?: string }[] };
const bank = JSON.parse(readFileSync("content/samples/sample-bank.json", "utf8"));
const lesson = JSON.parse(readFileSync("content/lessons/dopamine.json", "utf8"));
const questions: Q[] = [
  ...bank.exams.flatMap((e: { items: ({ type: string; questions?: Q[] } & Q)[] }) => e.items.flatMap((i) => (i.type === "passage" ? i.questions! : [i]))),
  ...lesson.questions,
];
const visible = words(questions.map((q) => [q.stem, ...q.choices.map((c) => c.text)].join(" ")).join(" "));
const secrets = questions
  .flatMap((q) => [q.explanation, ...q.choices.map((c) => c.rationale ?? "")])
  .flatMap((text) => {
    const w = words(text).split(" ");
    for (let i = 0; i + 6 <= w.length; i++) {
      const fp = w.slice(i, i + 6).join(" ");
      if (w.slice(i, i + 6).every((x) => x.length > 1) && !visible.includes(fp)) return [fp];
    }
    return [];
  });

const REDIRECTS: [string, string][] = [
  ["http://studywithshabari.com/", "https://studywithshabari.com/"],
  ["https://www.studywithshabari.com/about", "https://studywithshabari.com/about"],
  ["https://studywithshabari.org/practice", "https://studywithshabari.com/practice"],
  ["https://studywithshabari.info/", "https://studywithshabari.com/resources"],
  ["https://studywithshabari.store/", "https://studywithshabari.com/pricing"],
];

test("deployment: served over HTTPS with the security headers", async ({ request }) => {
  // Without redirects, so Vercel's login wall (a 302 to vercel.com) fails here instead of passing.
  const res = await request.get("/", { maxRedirects: 0 });
  expect(res.status(), "Deployment Protection answered: is VERCEL_AUTOMATION_BYPASS_SECRET right?").toBe(200);
  expect(res.url()).toMatch(/^https:\/\//);
  const h = res.headers();
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
});

test("deployment: the database answers the health check", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status(), await res.text()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, db: "up" });
});

test("deployment: only the canonical production site may be indexed", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  if (production) expect(robots).toMatch(/Allow: \//);
  else expect(robots).toMatch(/Disallow: \/\s*$/m);
});

test("deployment: only the custom domains may be indexed", async ({ request }) => {
  // The *.vercel.app URL serves the production build and its permissive robots.txt, so it says noindex itself.
  const res = await request.get("/robots.txt");
  if (base.host.endsWith(".vercel.app")) expect(res.headers()["x-robots-tag"]).toBe("noindex");
  if (onCanonical) expect(res.headers()["x-robots-tag"]).toBeUndefined();
});

test("deployment: every public page loads", async ({ request }) => {
  for (const path of PAGES) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
    expect(await res.text(), path).not.toMatch(/Application error|Internal Server Error/);
  }
});

test("deployment: the home and MCAT pages render without client errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/mcat"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("deployment: sign-in reaches the database and rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`smoke-${Date.now()}@example.invalid`);
  await page.getByLabel("Password").fill("not-a-real-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don’t match.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  // Signed-out visitors are sent to sign-in from the dashboard.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("deployment: no answer key reaches a guest, and drafts stay hidden", async ({ request }) => {
  expect(secrets.length).toBeGreaterThan(10);
  const check = (where: string, body: string) => {
    expect(body, `${where}: answer-key field`).not.toMatch(KEY_FIELDS);
    const text = words(body);
    expect(secrets.filter((fp) => text.includes(fp)), `${where}: explanation or rationale text`).toEqual([]);
  };
  const practice = await (await request.get("/practice")).text();
  const sets = [...new Set([...practice.matchAll(/href="(\/practice\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  for (const path of [...PAGES, ...sets]) check(path, await (await request.get(path)).text());

  // The samples wait in REVIEW, so their pages aren't served.
  expect((await request.get("/practice/cp-sample-set-1")).status()).toBe(404);
  // The AI-drafted lesson: a real 404 in production until an admin approves it, shown with the draft
  // badge on a protected preview. Once approved, production serves it without the badge.
  const res = await request.get("/lessons/dopamine");
  if (production) {
    const html = await res.text();
    if (res.status() === 404) {
      expect(html).not.toContain("drafted with AI");
      expect(html).not.toContain(lesson.lesson.title);
    } else {
      expect(res.status(), "an unapproved lesson must be a 404").toBe(200);
      expect(html).not.toContain('data-testid="draft-badge"');
      check("/lessons/dopamine", html);
    }
  } else if (res.status() === 200) {
    const html = await res.text();
    expect(html).toContain("drafted with AI");
    check("/lessons/dopamine", html);
  } else expect(res.status()).toBe(404);
});

test("deployment: the chat widget's hosts are allowed only on public pages", async ({ request }) => {
  const csp = async (path: string) => (await request.get(path, { maxRedirects: 0 })).headers()["content-security-policy"] ?? "";
  const home = await csp("/");
  test.skip(!/voiceable/.test(home), "the chat widget isn't configured on this deployment");
  expect(home).toContain("https://ionos.ai-voicereceptionist.com");
  for (const path of ["/login", "/signup", "/admin", "/dashboard", "/exam/x", "/forgot-password", "/reset-password", "/lessons/dopamine/a/x"]) {
    expect(await csp(path), path).not.toMatch(/ionos|voiceable/);
  }
});

test("16. canonical site is served over HTTPS with HSTS", async ({ request }) => {
  test.skip(!onCanonical, "checked after the DNS cutover, against https://studywithshabari.com");
  const res = await request.get("https://studywithshabari.com/");
  expect(res.status()).toBe(200);
  expect(res.headers()["strict-transport-security"]).toContain("max-age=");
});

for (const [from, to] of REDIRECTS) {
  test(`15. ${from} → ${to}`, async ({ request }) => {
    test.skip(!onCanonical, "secondary-domain redirects are checked after the DNS cutover");
    const res = await request.get(from);
    expect(res.url()).toBe(to);
    expect(res.status()).toBe(200);
  });
}
