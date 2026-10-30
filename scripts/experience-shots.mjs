// Screenshots of the /experience prototypes at their key scroll positions, from a production build.
//   E2E_PORT=3170 node scripts/experience-shots.mjs
// Desktop 1440×900 in Chromium (GPU), iPhone 14 in WebKit, plus WebGL-off and reduced-motion
// variants for the comparison sheets. Writes .local/shots/experience/<route>/… and
// .local/shots/experience/compare/raw/….
import { mkdirSync } from "node:fs";
import { chromium, devices, webkit } from "@playwright/test";

const BASE = `http://localhost:${process.env.E2E_PORT ?? 3170}`;
const OUT = ".local/shots/experience";
const GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
const ROUTES = ["specimen", "synapse", "instrument", "slice", "admissions", ""];

/** Scroll so beat i is on its reading line (as the page itself computes it). */
async function toBeat(page, i) {
  return page.evaluate((i) => {
    const steps = document.querySelectorAll("[data-step]");
    const s = steps[i];
    if (!s) return false;
    const wide = innerWidth >= 768;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focus = wide || reduce ? innerHeight / 2 : innerHeight * 0.75;
    window.scrollTo(0, Math.max(0, s.getBoundingClientRect().top + scrollY + s.offsetHeight / 2 - focus));
    return s.getAttribute("data-beat");
  }, i);
}

async function shootRoute(browser, ctxOpts, route, device) {
  const dir = `${OUT}/${route || "index"}`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/experience/${route}`, { waitUntil: "load" });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${dir}/${device}-00-first-viewport.png` });
  const steps = await page.locator("[data-step]").count();
  for (let i = 1; i < steps; i++) {
    const beat = await toBeat(page, i);
    await page.waitForTimeout(1700);
    await page.screenshot({ path: `${dir}/${device}-${String(i).padStart(2, "0")}-${beat}.png` });
  }
  if (route === "slice") {
    // The moment of understanding, answered.
    await page.locator("#understand").scrollIntoViewIfNeeded();
    await page.locator("#score-h").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/${device}-20-score.png` });
    const q6 = page.locator('[data-question="q6"]');
    await q6.getByText("+1", { exact: true }).click();
    await q6.getByText("Unsure", { exact: true }).click();
    await q6.getByRole("button", { name: "Check answer" }).click();
    await page.getByTestId("reveal-q6").waitFor();
    await page.locator("#understand-h").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/${device}-21-q6-answered.png` });
    await page.getByTestId("charge-explorer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${dir}/${device}-22-charge-explorer.png` });
    await page.getByRole("button", { name: "Try a related question" }).click();
    const q2 = page.locator('[data-question="q2"]');
    await q2.getByText("dopamine cannot cross the blood–brain barrier").click();
    await q2.getByRole("button", { name: "Check answer" }).click();
    await page.getByTestId("learned").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/${device}-23-learned.png` });
    await page.locator("#book-h").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${dir}/${device}-24-booking.png` });
  }
  if (route === "admissions") {
    await page.getByRole("tab", { name: /Timeline/ }).click();
    await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/${device}-10-timeline-station.png` });
  }
  if (!route) await page.screenshot({ path: `${dir}/${device}-01-full.png`, fullPage: true });
  await ctx.close();
}

async function compare(browser, label, ctxOpts) {
  mkdirSync(`${OUT}/compare/raw`, { recursive: true });
  for (const r of ["specimen", "synapse", "instrument"]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/experience/${r}`, { waitUntil: "load" });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${OUT}/compare/raw/${label}-${r}-first.png` });
    const mid = { specimen: 3, synapse: 4, instrument: 2 }[r];
    await toBeat(page, mid);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/compare/raw/${label}-${r}-mid.png` });
    await ctx.close();
  }
}

const desktop = { viewport: { width: 1440, height: 900 } };
const iphone = { ...devices["iPhone 14"] };
delete iphone.defaultBrowserType;

const gpu = await chromium.launch({ args: GPU });
for (const r of ROUTES) await shootRoute(gpu, desktop, r, "desktop");
await compare(gpu, "desktop", desktop);
await compare(gpu, "phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await compare(gpu, "desktop-reduced", { ...desktop, reducedMotion: "reduce" });
await compare(gpu, "phone-reduced", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
await gpu.close();

const nogl = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
await compare(nogl, "desktop-webgl-off", desktop);
await compare(nogl, "phone-webgl-off", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await nogl.close();

const wk = await webkit.launch();
for (const r of ROUTES) await shootRoute(wk, iphone, r, "iphone14");
await wk.close();
console.log("shots written to", OUT);
