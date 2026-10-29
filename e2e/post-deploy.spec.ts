import { expect, test } from "@playwright/test";

// 15-16 against the live deployment, after DNS cutover:
//   SMOKE_BASE_URL=https://studywithshabari.com npx playwright test
const REDIRECTS: [string, string][] = [
  ["http://studywithshabari.com/", "https://studywithshabari.com/"],
  ["https://www.studywithshabari.com/about", "https://studywithshabari.com/about"],
  ["https://studywithshabari.org/practice", "https://studywithshabari.com/practice"],
  ["https://studywithshabari.info/", "https://studywithshabari.com/resources"],
  ["https://studywithshabari.store/", "https://studywithshabari.com/pricing"],
];

test("16. canonical site is served over HTTPS with HSTS", async ({ request }) => {
  const res = await request.get("https://studywithshabari.com/");
  expect(res.status()).toBe(200);
  expect(res.headers()["strict-transport-security"]).toContain("max-age=");
});

for (const [from, to] of REDIRECTS) {
  test(`15. ${from} → ${to}`, async ({ request }) => {
    const res = await request.get(from);
    expect(res.url()).toBe(to);
    expect(res.status()).toBe(200);
  });
}
