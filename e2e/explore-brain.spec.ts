import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type Page } from "@playwright/test";

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);

const SWIFTSHADER_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

test("brain explorer: region selection by list and 3D raycast, layers, approximation notes, and attribution", async ({ baseURL, request }) => {
  test.setTimeout(180_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://studywithshabari.com/explore/brain</loc>");
  expect(sitemap).toContain("<loc>https://studywithshabari.com/credits</loc>");

  const b = await chromium.launch({ args: SWIFTSHADER_ARGS });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/explore/brain");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Explore the brain");
  await expect(page.getByTestId("explorer-credit")).toContainText("CC BY 4.0");
  await expect(page.getByTestId("explorer-credit")).toContainText("Allen Human Reference Atlas");

  // Select region via accessible list button
  await page.locator('[data-region-button="brocas-area"]').click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Broca's area");
  await expect(page.getByTestId("explorer-details")).toContainText("expressive");

  // Select approximate region (VTA) and verify approximate badge + dopamine lesson lines
  await page.locator('[data-region-button="vta"]').click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Ventral tegmental area (VTA)");
  await expect(page.getByTestId("selected-region-approximate")).toContainText("Approximate boundary");
  await expect(page.getByTestId("explorer-details")).toContainText("Mesolimbic");

  // Wait for 3D scene ready and pick a lobe by raycast on the canvas
  await page.waitForSelector('[data-explorer-ready="true"]', { timeout: 60_000 });
  await page.getByRole("button", { name: "Lobes" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.waitForTimeout(300);
  const pt = await page.evaluate(() => {
    const exp = (window as unknown as { __explorer?: { pointFor: (id: string) => [number, number] | null } }).__explorer;
    return exp?.pointFor("frontal-lobe") ?? null;
  });
  expect(pt).not.toBeNull();
  if (pt) {
    await page.mouse.click(pt[0], pt[1]);
    await expect(page.getByTestId("selected-region-name")).toHaveText("Frontal lobe");
  }

  expect(await serious(page)).toEqual([]);

  // Check /credits page
  await page.getByRole("link", { name: "Full model attribution and modifications" }).click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("3D Model Credits");
  await expect(page.getByRole("main")).toContainText("RRID:SCR_017764");
  expect(await serious(page)).toEqual([]);
  expect(errors).toEqual([]);
  await b.close();
});

test("brain explorer: WebGL off shows layer stills, full region list, notes, and 0 canvases", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  await page.goto("/explore/brain");
  await page.waitForTimeout(1000);
  expect(await page.locator("canvas").count()).toBe(0);
  await expect(page.getByTestId("brain-still")).toBeVisible();
  await page.locator('[data-region-button="hippocampus"]').click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Hippocampus");
  await expect(page.getByTestId("explorer-details")).toContainText("anterograde amnesia");
  await b.close();
});

test("brain explorer: reduced motion disables auto-rotation and fly-to animation", async ({ baseURL }) => {
  test.setTimeout(120_000);
  const b = await chromium.launch({ args: SWIFTSHADER_ARGS });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/explore/brain");
  await page.waitForSelector('[data-explorer-ready="true"]', { timeout: 60_000 });
  await page.locator('[data-region-button="cerebellum"]').click();
  const moving = await page.evaluate(() => {
    const exp = (window as unknown as { __explorer?: { moving: () => boolean } }).__explorer;
    return exp?.moving() ?? false;
  });
  expect(moving).toBe(false);
  expect(await serious(page)).toEqual([]);
  await b.close();
});

test("brain explorer: WebGL memory is disposed cleanly across 5 route visits and hidden scene stops drawing", async ({ baseURL }) => {
  test.setTimeout(180_000);
  const b = await chromium.launch({ args: SWIFTSHADER_ARGS });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/explore/brain");
  const counts: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('[data-explorer-ready="true"]', { timeout: 60_000 });
    await page.waitForTimeout(400);
    const mem = await page.evaluate(() => {
      const exp = (window as unknown as { __explorer?: { memory: () => { geometries: number; textures: number } } }).__explorer;
      return exp?.memory() ?? null;
    });
    expect(mem).not.toBeNull();
    counts.push(JSON.stringify(mem));
    await page.getByRole("link", { name: "Full model attribution and modifications" }).click();
    await page.waitForURL("**/credits");
    await page.waitForTimeout(200);
    const f0 = await page.evaluate(() => (window as unknown as { __explorer?: { frames: () => number } }).__explorer?.frames() ?? 0);
    await page.waitForTimeout(500);
    const f1 = await page.evaluate(() => (window as unknown as { __explorer?: { frames: () => number } }).__explorer?.frames() ?? 0);
    expect(f1).toBe(f0);
    await page.getByRole("link", { name: "/explore/brain" }).click();
    await page.waitForURL("**/explore/brain");
  }
  for (const c of counts) expect(c).toBe(counts[0]);
  await b.close();
});

test.describe("phone 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("brain explorer (390×844): CTA in first viewport, no horizontal overflow, clear of chat bubble, axe clean", async ({ page }) => {
    await page.goto("/explore/brain");
    const cta = page.getByRole("link", { name: "Book a free consult call" }).first();
    await expect(cta).toBeInViewport({ ratio: 1 });
    const corner = (b: { x: number; y: number; width: number; height: number }) => b.x + b.width > 390 - 100 && b.y + b.height > 844 - 100;
    for (const f of [0, 0.3, 0.6, 1]) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
      await page.waitForTimeout(200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `overflow at ${f}`).toBeLessThanOrEqual(0);
      for (const a of await page.locator('a[href^="/book"]').all()) {
        if (!(await a.isVisible())) continue;
        const box = await a.boundingBox();
        if (!box || box.y + box.height < 0 || box.y > 844) continue;
        expect(corner(box), `booking link in chat corner at ${f}`).toBe(false);
      }
    }
    expect(await serious(page)).toEqual([]);
  });
});
