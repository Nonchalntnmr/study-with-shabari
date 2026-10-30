import { expect, test } from "@playwright/test";

// The /experience prototypes (src/app/experience): every route renders on the production build,
// carries noindex, offers the consult CTA with the right service, and an unknown prototype is a
// real 404. The production-deployment gate is unit-tested in tests/unit/experience-timeline.test.ts.

const ROUTES = [
  { path: "/experience", h1: "The Beauty of Intelligence", book: null },
  { path: "/experience/specimen", h1: "Dopamine", book: "/book?service=mcat" },
  { path: "/experience/synapse", h1: "Dopamine", book: "/book?service=mcat" },
  { path: "/experience/instrument", h1: /One-on-one MCAT tutoring/, book: "/book?service=mcat" },
  { path: "/experience/slice", h1: "Dopamine", book: "/book?service=mcat" },
  { path: "/experience/admissions", h1: /College admissions help/, book: "/book?service=admissions" },
] as const;

for (const r of ROUTES) {
  test(`experience renders: ${r.path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text());
    });
    const res = await page.goto(r.path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(r.h1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const header = page.locator("header [data-book-cta]");
    await expect(header).toHaveText("Book a free consult call");
    if (r.book) await expect(header).toHaveAttribute("href", r.book);
    await expect(page.getByText("Prototype. Not part of the live site.")).toBeVisible();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
}

test("experience: an unknown prototype answers a real 404", async ({ request }) => {
  expect((await request.get("/experience/does-not-exist")).status()).toBe(404);
});

test("experience: the 522 reveal states the 522 and her three section scores plainly, and nothing else", async ({ request }) => {
  // Founder decision 2026-10-30 07:24: 522 and 131 C/P, 132 B/B, 132 P/S, stated plainly. CARS is never
  // derived or shown; no percentile, no "verified", no "as reported" hedge.
  for (const path of ["/experience/instrument", "/experience/slice"]) {
    // Every word in the server HTML, markup stripped (SVG coordinates and class names aside).
    const text = (await (await request.get(path)).text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
    expect(text).toContain("MCAT 522");
    for (const s of ["131", "132", "C/P", "B/B", "P/S"]) expect(text, `${path}: ${s}`).toContain(s);
    for (const s of [/\bCARS\b/, /\b12[0-9]\b/, /percentile/i, /verified/i, /as reported/i, /Shabari reports/i]) expect(text, `${path}: ${s}`).not.toMatch(s);
  }
});

test("experience: the beat navigation moves the view and focus to the chosen beat", async ({ page }) => {
  await page.goto("/experience/specimen");
  const nav = page.getByRole("navigation", { name: /beats$/ });
  await nav.getByRole("button", { name: "Go to why it is achiral" }).click();
  await expect(page.getByRole("heading", { name: "Achiral", level: 2 })).toBeFocused();
  await expect(nav.getByRole("button", { name: "Go to why it is achiral" })).toHaveAttribute("aria-current", "step");
});

test("experience: the admissions journey works from the keyboard", async ({ page }) => {
  await page.goto("/experience/admissions");
  const tabs = page.getByRole("tablist", { name: "The application, step by step" });
  await tabs.getByRole("tab", { name: /Essays/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: /Activities and honors/ })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Activities list and honors section");
  await page.keyboard.press("End");
  await expect(page.getByRole("tabpanel")).toContainText("SAT and ACT strategy");
  await tabs.getByRole("tab", { name: /Timeline/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Summer before senior year");
  await expect(page.getByText("nothing here is a guarantee")).toBeVisible();
});
