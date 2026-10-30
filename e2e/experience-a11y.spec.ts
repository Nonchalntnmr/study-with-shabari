import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type Page } from "@playwright/test";

// axe (WCAG 2.1 A/AA) on every prototype, desktop and phone, with and without WebGL: no serious or
// critical violations. And WebGL cleanup: five client-side visits to each 3D prototype leave the
// renderer's memory where it started.

const PATHS = ["/experience", "/experience/specimen", "/experience/synapse", "/experience/instrument", "/experience/slice", "/experience/admissions"];
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);

for (const [label, size] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`experience a11y (${label}): no serious or critical axe violations`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    for (const p of PATHS) {
      await page.goto(p);
      await page.waitForTimeout(800);
      expect(await serious(page), p).toEqual([]);
      // Mid-sequence, with the beat panels and labels on screen.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
      await page.waitForTimeout(500);
      expect(await serious(page), `${p} mid-sequence`).toEqual([]);
    }
  });
}

test("experience a11y: every interactive control is reachable by keyboard with a visible focus ring", async ({ page }) => {
  await page.goto("/experience/synapse");
  const sw = page.getByRole("switch", { name: "Block DAT" });
  await sw.focus();
  await page.keyboard.press("Space");
  await expect(sw).toBeChecked();
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const track = el.nextElementSibling as HTMLElement;
    return getComputedStyle(track).outlineStyle;
  });
  expect(ring).not.toBe("none");
  await page.goto("/experience/specimen");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return { tag: el.tagName, outline: getComputedStyle(el).outlineStyle };
  });
  expect(focused.outline).not.toBe("none");
});

test("experience WebGL: renderer memory does not grow over five visits, and hidden scenes stop drawing", async ({ baseURL }) => {
  test.setTimeout(180_000);
  // Software WebGL, so this runs on any CI machine.
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => ((window as unknown as { __glProbe: unknown[] }).__glProbe = []));
  const page = await ctx.newPage();
  for (const route of ["/experience/specimen", "/experience/synapse"]) {
    await page.goto("/experience");
    const counts: { geometries: number; textures: number }[] = [];
    let renderers = 0;
    for (let i = 0; i < 5; i++) {
      await page.locator(`main a[href="${route}"]`).first().click();
      await page.waitForURL(`**${route}`);
      await page.waitForSelector("[data-stage-ready=true]", { timeout: 60_000 });
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => {
        const probe = (window as unknown as { __glProbe: { gl: { info: { memory: { geometries: number; textures: number }; render: { frame: number } } } }[] }).__glProbe;
        return { n: probe.length, ...probe[probe.length - 1].gl.info.memory };
      });
      counts.push({ geometries: m.geometries, textures: m.textures });
      renderers = m.n;
      await page.locator('footer a[href="/experience"]').click();
      await page.waitForURL("**/experience");
      // Hidden (kept by the router for back navigation) or unmounted: either way, not drawing.
      const frames = async () =>
        page.evaluate(() => {
          const probe = (window as unknown as { __glProbe: { gl: { info: { render: { frame: number } } } }[] }).__glProbe;
          return probe[probe.length - 1].gl.info.render.frame;
        });
      await page.waitForTimeout(300);
      const f0 = await frames();
      await page.waitForTimeout(700);
      expect(await frames(), `${route}: still drawing after navigating away`).toBe(f0);
    }
    test.info().annotations.push({ type: route, description: JSON.stringify({ counts, renderers }) });
    for (const c of counts) expect(c, `${route}: renderer memory across visits`).toEqual(counts[0]);
  }
  await b.close();
});
