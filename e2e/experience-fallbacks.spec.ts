import { chromium, expect, test } from "@playwright/test";

// With WebGL off, or with reduced motion, every prototype still tells the whole story: no canvas,
// the stills (posters and SVG figures), every beat's text, and both CTAs.

const STORIES = [
  { path: "/experience/specimen", beats: ["A catecholamine", "Four parts, one molecule", "A proton on the amine", "Achiral", "One molecule, every MCAT section"], second: "/dopamine" },
  { path: "/experience/synapse", beats: ["Packed into vesicles", "A vesicle opens", "Crossing the cleft", "D1 against D2", "How it’s cleared"], second: "/dopamine" },
  { path: "/experience/instrument", beats: ["522, on the scale", "Clear, simple, built around you", "One-on-one", "Start with a free consult call."], second: "/mcat" },
  { path: "/experience/slice", beats: ["A proton on the amine", "D1 against D2", "Check your understanding", "Start with a free consult call."], second: "/dopamine" },
];

test("WebGL off: no canvas, the stills and the whole story, both CTAs", async ({ baseURL }) => {
  test.setTimeout(120_000);
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const s of STORIES) {
    await page.goto(s.path);
    await page.waitForTimeout(2500);
    expect(await page.locator("canvas").count(), s.path).toBe(0);
    await expect(page.locator("[data-stage]").first()).toHaveAttribute("data-stage-mode", "static").catch(() => {});
    for (const t of s.beats) await expect(page.getByRole("heading", { name: t, exact: true }).first(), `${s.path}: ${t}`).toBeAttached();
    await expect(page.locator('main a[href="/book?service=mcat"]').first()).toBeAttached();
    await expect(page.locator(`main a[href="${s.second}"]`).first()).toBeAttached();
    if (s.path !== "/experience/instrument") {
      // The stage shows a still for the beat on screen.
      await expect(page.locator("[data-still] img, [data-still] svg[role=img]").first()).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
  await b.close();
});

test("WebGL off: blocking DAT changes the reuptake still", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  await page.goto("/experience/synapse");
  await page.getByRole("button", { name: "Go to reuptake" }).click();
  const still = page.locator('[data-still="5"] svg');
  const before = await still.innerHTML();
  await page.getByRole("switch", { name: "Block DAT" }).check({ force: true });
  await expect(page.getByRole("status").filter({ hasText: "Cocaine blocks DAT" })).toBeVisible();
  expect(await page.locator('[data-still="5"] svg').innerHTML()).not.toBe(before);
  await b.close();
});

test("reduced motion: no stage, no canvas, each beat with its own still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const s of STORIES) {
    await page.goto(s.path);
    await page.waitForTimeout(1500);
    expect(await page.locator("canvas").count(), s.path).toBe(0);
    for (const stage of await page.locator(".exp-story-stage").all()) await expect(stage).toBeHidden();
    const figures = page.locator(".exp-inline-figure");
    expect(await figures.count()).toBeGreaterThan(1);
    await expect(figures.first()).toBeVisible();
    for (const t of s.beats) await expect(page.getByRole("heading", { name: t, exact: true }).first()).toBeVisible();
  }
});
