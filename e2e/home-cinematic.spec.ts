import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type Page } from "@playwright/test";

// Stage 1: the home page as one experience, Specimen → Synapse → 522 → learning → booking, then the
// existing sections. The founder's hero copy and CTAs stay; Q6 and Q2 are checked on the server;
// the 522 is stated plainly with her three section scores; WebGL off and reduced motion tell the
// whole story; the phone CTA stays in the first screen and clear of the chat bubble.

const HEADLINE = "MCAT tutoring and college admissions help, from someone who recently went through both.";
const ACTS = ["A catecholamine", "Four parts, one molecule", "Protonated at physiological pH", "Achiral", "How it’s made (catecholamine synthesis)", "Receptors", "How it’s cleared", "MCAT 522", "Section scores", "Check your understanding", "Start with a free consult call."];
const EXPLANATIONS = [
  "Tyrosine hydroxylase converts tyrosine to L-DOPA and controls the pathway's overall rate",
  "L-DOPA enters through amino acid transporters and is converted in the brain",
  "Dopamine normally inhibits prolactin; blocking it raises prolactin",
  "Blocking DAT prevents reuptake, so dopamine stays in the synapse longer",
  "Once a reward is fully predicted, the dopamine burst moves to the cue",
  "the catechol –OH groups (pKa ≈ 9–10+) are mostly neutral",
];
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);

test("home: the hero keeps the approved copy and both CTAs, then the five acts, then the existing sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEADLINE);
  await expect(page.getByText("MIT Class of 2027 · Premed")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore MCAT tutoring" }).first()).toHaveAttribute("href", "/mcat");
  await expect(page.getByRole("link", { name: "Explore the free dopamine lesson" })).toHaveAttribute("href", "/dopamine");
  for (const t of ACTS) await expect(page.getByRole("heading", { name: t, exact: true }).first(), t).toBeAttached();
  // In order down the page.
  const tops = await Promise.all(["A catecholamine", "Receptors", "MCAT 522", "Check your understanding", "Start with a free consult call."].map((t) => page.getByRole("heading", { name: t, exact: true }).first().evaluate((el) => el.getBoundingClientRect().top + scrollY)));
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  await expect(page.locator('section[aria-labelledby="book-act-h"] a', { hasText: "Book a free consult call" })).toHaveAttribute("href", "/book?service=mcat");
  // The existing sections follow, unchanged.
  for (const t of ["Start free. No signup.", "Hi, I’m Shabari.", "Questions"]) await expect(page.getByRole("heading", { name: t }).first()).toBeAttached();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test("home: the 522 reveal states MCAT 522 and her three section scores plainly, and nothing else", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  expect(text).toContain("MCAT 522");
  for (const s of [/\bCARS\b/, /percentile/i, /verified/i, /as reported/i, /Shabari reports/i]) expect(text, String(s)).not.toMatch(s);
  await page.goto("/");
  const reveal = page.getByRole("region", { name: "MCAT 522" });
  for (const s of ["C/P: 131", "B/B: 132", "P/S: 132", "Each section from 118 to 132.", "Totals run from 472 to 528."]) await expect(reveal.getByText(s)).toBeAttached();
});

test("home: no answer key or explanation before answering; Q6 then Q2 through the server", async ({ page, request }) => {
  const html = (await (await request.get("/")).text()).replace(/&#x27;|&#39;/g, "'");
  for (const e of EXPLANATIONS) expect(html, e).not.toContain(e);
  expect(html).not.toMatch(/\\?"answer\\?":\s*\d/);

  await page.goto("/");
  const q6 = page.locator('[data-question="q6"]');
  await q6.scrollIntoViewIfNeeded();
  await q6.getByText("+1", { exact: true }).click();
  await q6.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal-q6")).toContainText("Correct.");
  await expect(page.getByTestId("reveal-q6")).toContainText(EXPLANATIONS[5]);
  await expect(page.getByTestId("charge-explorer")).toContainText("99.7%");
  await page.getByRole("button", { name: "Try a related question" }).click();
  const q2 = page.locator('[data-question="q2"]');
  await q2.getByText("dopamine is toxic").click();
  await q2.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal-q2")).toContainText("Not quite. The answer is C.");
  await expect(page.getByTestId("learned")).toContainText("1 of 2 right");
});

test("home: WebGL off tells the whole story with stills, and both hero CTAs", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const page = await (await b.newContext({ baseURL })).newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(await page.locator("canvas").count()).toBe(0);
  await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore MCAT tutoring" }).first()).toBeVisible();
  for (const t of ACTS) await expect(page.getByRole("heading", { name: t, exact: true }).first(), t).toBeAttached();
  await expect(page.locator("[data-still] img, [data-still] svg[role=img]").first()).toBeVisible();
  expect(errors).toEqual([]);
  await b.close();
});

test("home: reduced motion has no scroll-driven stage and no camera motion; the numbers are final and static", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(await page.locator("canvas").count()).toBe(0);
  for (const stage of await page.locator(".exp-story-stage").all()) await expect(stage).toBeHidden();
  const figures = page.locator(".exp-inline-figure");
  expect(await figures.count()).toBeGreaterThan(5);
  // The reveal's still shows the final numbers.
  const reveal = page.getByRole("region", { name: "MCAT 522" });
  await expect(reveal.locator(".exp-inline-figure").first()).toContainText("522");
  await expect(reveal.locator(".exp-inline-figure").nth(1)).toContainText("131");
  for (const t of ACTS) await expect(page.getByRole("heading", { name: t, exact: true }).first()).toBeVisible();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("home (390×844): no overflow, the CTA on the first screen, and booking always clear of the chat bubble", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Book a free consult call" }).first()).toBeInViewport({ ratio: 1 });
    const corner = (b: { x: number; y: number; width: number; height: number }) => b.x + b.width > 390 - 100 && b.y + b.height > 844 - 100;
    for (const f of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
      await page.waitForTimeout(250);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `overflow at ${f}`).toBeLessThanOrEqual(0);
      // Every booking link on screen sits outside the bubble's corner and is not covered.
      for (const a of await page.locator('a[href^="/book"]').all()) {
        if (!(await a.isVisible()) || !(await a.evaluate((el) => getComputedStyle(el.closest("[aria-hidden=true]") ?? el).opacity !== "0"))) continue;
        const box = await a.boundingBox();
        if (!box || box.y + box.height < 0 || box.y > 844) continue;
        expect(corner(box), `booking link in the chat bubble's corner at ${f}`).toBe(false);
      }
    }
    // Past the hero, the sticky pill offers booking.
    await page.evaluate(() => window.scrollTo(0, document.querySelector("#hero-ctas")!.getBoundingClientRect().bottom + scrollY + 400));
    await page.waitForTimeout(500);
    const pill = page.locator("[data-sticky-book]");
    await expect(pill).toBeInViewport();
    await expect(pill).toHaveAttribute("href", "/book?service=mcat");
  });

  test("home (390×844): axe, at the top and through the acts", async ({ page }) => {
    await page.goto("/");
    for (const f of [0, 0.15, 0.3, 0.45, 0.6]) {
      await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), f);
      await page.waitForTimeout(400);
      expect(await serious(page), `scrolled ${f}`).toEqual([]);
    }
  });
});

test("home: axe on desktop through the acts", async ({ page }) => {
  await page.goto("/");
  for (const f of [0.1, 0.25, 0.4, 0.55]) {
    await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), f);
    await page.waitForTimeout(400);
    expect(await serious(page), `scrolled ${f}`).toEqual([]);
  }
});

test("home: renderer memory does not grow over five route changes, and a hidden home stops drawing", async ({ baseURL }) => {
  test.setTimeout(180_000);
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => ((window as unknown as { __glProbe: unknown[] }).__glProbe = []));
  const page = await ctx.newPage();
  type Probe = { gl: { info: { memory: { geometries: number; textures: number }; render: { frame: number } } } }[];
  const probe = () => page.evaluate(() => (window as unknown as { __glProbe: Probe }).__glProbe.map((p) => ({ ...p.gl.info.memory, frame: p.gl.info.render.frame })));
  await page.goto("/");
  const counts: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector("[data-stage-ready=true]", { timeout: 60_000 });
    await page.waitForTimeout(1200);
    counts.push(JSON.stringify((await probe()).map(({ geometries, textures }) => ({ geometries, textures }))));
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "MCAT Prep", exact: true }).click();
    await page.waitForURL("**/mcat");
    await page.waitForTimeout(400);
    const f0 = (await probe()).map((p) => p.frame);
    await page.waitForTimeout(700);
    expect((await probe()).map((p) => p.frame), "home scenes still drawing on /mcat").toEqual(f0);
    await page.getByRole("link", { name: "Study with Shabari, home" }).click();
    await page.waitForURL((u) => u.pathname === "/");
  }
  test.info().annotations.push({ type: "renderer memory per visit", description: counts.join(" | ") });
  for (const c of counts) expect(c).toBe(counts[0]);
  await b.close();
});
