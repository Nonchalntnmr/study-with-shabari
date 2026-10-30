import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type Page } from "@playwright/test";
import { SIGNALING_QUESTIONS } from "../src/lib/explore/signaling-questions";

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);

test("signaling explorer: action potential, conduction, pump, synapse, receptors, links, and server-checked quiz", async ({ page, request }) => {
  const html = (await (await request.get("/explore/signaling")).text()).replace(/&#x27;|&#39;/g, "'");
  for (const q of SIGNALING_QUESTIONS) {
    expect(html, q.explanation).not.toContain(q.explanation);
  }
  expect(html).not.toMatch(/\\?"answer\\?":\s*\d/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://studywithshabari.com/explore/signaling</loc>");

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mcat");
  await expect(page.getByRole("link", { name: "Explore how neurons signal" }).first()).toHaveAttribute("href", "/explore/signaling");
  await page.getByRole("link", { name: "Explore how neurons signal" }).first().click();
  await expect(page).toHaveURL(/\/explore\/signaling$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("How neurons signal");

  // 1. Action potential: sub-threshold vs firing
  const ap = page.locator('[data-explorer="action-potential"]');
  await ap.getByRole("slider", { name: "Stimulus strength" }).fill("10");
  await ap.getByRole("button", { name: "Stimulate" }).click();
  await expect(ap.locator("[data-ap-status]")).toContainText("Below threshold");
  await ap.getByRole("slider", { name: "Stimulus strength" }).fill("20");
  await ap.getByRole("button", { name: "Stimulate" }).click();
  await expect(ap.locator("[data-ap-status]")).toContainText("Threshold reached");
  await ap.getByRole("button", { name: "Depolarization" }).click();
  await expect(ap.locator("[data-membrane]")).toHaveAttribute("data-na", "open");
  await ap.getByRole("button", { name: "Repolarization" }).click();
  await expect(ap.locator("[data-membrane]")).toHaveAttribute("data-na", "inactivated");

  // 2. Conduction: myelin switch and send
  const cond = page.locator('[data-explorer="conduction"]');
  await cond.getByRole("button", { name: "Send an action potential" }).click();
  await expect(cond.locator("[data-conduction-status]")).toContainText("Jumping from node to node");
  await cond.getByRole("switch", { name: "Myelin" }).click();
  await cond.getByRole("button", { name: "Send an action potential" }).click();
  await expect(cond.locator("[data-conduction-status]")).toContainText("Without myelin, it took longer");

  // 3. Pump: cycle through 3 steps
  const pump = page.locator('[data-explorer="pump"]');
  await pump.getByRole("button", { name: "Step 2" }).click();
  await expect(pump.locator("[data-pump-status]")).toContainText("Step 2.");

  // 4. Synapse: step to Termination and toggle Block DAT
  const syn = page.locator('[data-explorer="synapse"]');
  await syn.getByRole("button", { name: /Termination/ }).click();
  await expect(syn.locator("[data-synapse-status]")).toContainText("Ending the signal");
  await syn.getByRole("switch", { name: "Block DAT" }).click();
  await expect(syn.locator("[data-synapse-status]")).toContainText("Cocaine blocks DAT");

  // 5. Receptors: bind neurotransmitter
  const rec = page.locator('[data-explorer="receptors"]');
  await rec.getByRole("button", { name: "Bind the neurotransmitter" }).click();
  await expect(rec.locator("[data-receptor-status]")).toHaveAttribute("data-receptor-status", "bound");

  // 6. Quiz: check answer through server action
  const q1 = page.locator('[data-question="threshold"]');
  await q1.getByText("No action potential fires").click();
  await q1.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal-threshold")).toContainText("Correct.");
  await expect(page.getByTestId("reveal-threshold")).toContainText(SIGNALING_QUESTIONS[0].explanation);

  expect(await serious(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("signaling explorer: WebGL off renders the SVG stills and full content with 0 canvases", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  await page.goto("/explore/signaling");
  await page.waitForTimeout(1500);
  expect(await page.locator("canvas").count()).toBe(0);
  await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeVisible();
  await expect(page.locator("[data-synapse-still]")).toBeVisible();
  await b.close();
});

test("signaling explorer: WebGL renderer memory stays flat over 5 route transitions", async ({ baseURL }) => {
  test.setTimeout(180_000);
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => ((window as unknown as { __glProbe: unknown[] }).__glProbe = []));
  const page = await ctx.newPage();
  type Probe = { gl: { info: { memory: { geometries: number; textures: number } } } }[];
  const probe = () => page.evaluate(() => (window as unknown as { __glProbe: Probe }).__glProbe.map((p) => p.gl.info.memory));
  await page.goto("/explore/signaling");
  const counts: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.locator("#synapse").scrollIntoViewIfNeeded();
    await page.waitForSelector("[data-stage-ready=true]", { timeout: 60_000 });
    await page.waitForTimeout(600);
    counts.push(JSON.stringify(await probe()));
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "MCAT Prep", exact: true }).click();
    await page.waitForURL("**/mcat");
    await page.getByRole("link", { name: "Explore how neurons signal" }).first().click();
    await page.waitForURL("**/explore/signaling");
  }
  for (const c of counts) expect(c).toBe(counts[0]);
  await b.close();
});

test.describe("phone 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("signaling explorer (390×844): CTA in first viewport, no horizontal overflow, clear of chat bubble, axe clean", async ({ page }) => {
    await page.goto("/explore/signaling");
    const cta = page.getByRole("link", { name: "Book a free consult call" }).first();
    await expect(cta).toBeInViewport({ ratio: 1 });
    const corner = (b: { x: number; y: number; width: number; height: number }) => b.x + b.width > 390 - 100 && b.y + b.height > 844 - 100;
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
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
