import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type Page } from "@playwright/test";

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);

const SWIFTSHADER_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

test("anatomy explorer: organ selection by list and 3D raycast, system layers, related organs, and attribution", async ({ baseURL, request }) => {
  test.setTimeout(180_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://studywithshabari.com/explore/anatomy</loc>");

  const b = await chromium.launch({ args: SWIFTSHADER_ARGS });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/explore/anatomy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Explore the organ systems");
  await expect(page.getByTestId("explorer-credit")).toContainText("CC BY 4.0");
  await expect(page.getByTestId("explorer-credit")).toContainText("HuBMAP");

  // Select organ via accessible list button
  await page.locator('[data-region-button="kidneys"]').click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Kidneys");
  await expect(page.getByTestId("explorer-details")).toContainText("glomerulus");

  // Follow related organ link
  await page.getByTestId("explorer-details").getByRole("button", { name: "Heart" }).click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Heart");
  await expect(page.getByTestId("explorer-details")).toContainText("sinoatrial (SA) node");

  // Wait for 3D scene ready and pick an organ by raycast on the canvas
  await page.waitForSelector('[data-explorer-ready="true"]', { timeout: 60_000 });
  await page.getByRole("button", { name: "All systems" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.waitForTimeout(300);
  const pt = await page.evaluate(() => {
    const exp = (window as unknown as { __explorer?: { pointFor: (id: string) => [number, number] | null } }).__explorer;
    return exp?.pointFor("liver") ?? null;
  });
  expect(pt).not.toBeNull();
  if (pt) {
    await page.mouse.click(pt[0], pt[1]);
    await expect(page.getByTestId("selected-region-name")).toHaveText("Liver");
  }

  expect(await serious(page)).toEqual([]);

  // Check /credits page has anatomy attribution
  await page.getByRole("link", { name: "Full model attribution and modifications" }).click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(page.locator("#anatomy-credit")).toContainText("3D Reference Organ for Heart, Male");
  expect(await serious(page)).toEqual([]);
  expect(errors).toEqual([]);
  await b.close();
});

test("anatomy explorer: WebGL off shows layer stills, full organ list, notes, and 0 canvases", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  await page.goto("/explore/anatomy");
  await page.waitForTimeout(1000);
  expect(await page.locator("canvas").count()).toBe(0);
  await expect(page.getByTestId("anatomy-still")).toBeVisible();
  await page.locator('[data-region-button="pancreas"]').click();
  await expect(page.getByTestId("selected-region-name")).toHaveText("Pancreas");
  await expect(page.getByTestId("explorer-details")).toContainText("islets of Langerhans");
  await b.close();
});

test("anatomy explorer: WebGL memory is disposed cleanly across 5 route visits and hidden scene stops drawing", async ({ baseURL }) => {
  test.setTimeout(180_000);
  const b = await chromium.launch({ args: SWIFTSHADER_ARGS });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/explore/anatomy");
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
    await page.getByRole("link", { name: "/explore/anatomy" }).click();
    await page.waitForURL("**/explore/anatomy");
  }
  for (const c of counts) expect(c).toBe(counts[0]);
  await b.close();
});

test.describe("phone 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("anatomy explorer (390×844): CTA in first viewport, no horizontal overflow, clear of chat bubble, axe clean", async ({ page }) => {
    await page.goto("/explore/anatomy");
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
