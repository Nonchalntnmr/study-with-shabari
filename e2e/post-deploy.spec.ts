import { expect, test } from "@playwright/test";

// Checks against a real deployment:
//   SMOKE_BASE_URL=<deployment url> npx playwright test e2e/post-deploy.spec.ts
// Deployment checks run against any URL (a protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET).
// Domain checks (HTTPS on the canonical host, the secondary-domain redirects) run only once
// SMOKE_BASE_URL is the canonical domain, i.e. after the DNS cutover.
const base = new URL(process.env.SMOKE_BASE_URL ?? "https://studywithshabari.com");
const onCanonical = base.host === "studywithshabari.com";

const REDIRECTS: [string, string][] = [
  ["http://studywithshabari.com/", "https://studywithshabari.com/"],
  ["https://www.studywithshabari.com/about", "https://studywithshabari.com/about"],
  ["https://studywithshabari.org/practice", "https://studywithshabari.com/practice"],
  ["https://studywithshabari.info/", "https://studywithshabari.com/resources"],
  ["https://studywithshabari.store/", "https://studywithshabari.com/pricing"],
];

test("deployment: served over HTTPS with the security headers", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
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
  if (onCanonical) expect(robots).toMatch(/Allow: \//);
  else expect(robots).toMatch(/Disallow: \/\s*$/m);
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
