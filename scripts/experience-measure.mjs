// Measures the /experience prototypes against the same yardstick, on a production build.
//   E2E_PORT=3170 node scripts/experience-measure.mjs [routes…]
// Server: scripts/e2e-server.sh (next build + next start). Writes .local/shots/experience/measure.json.
//
// Same method for every route:
// - load: iPhone 14 viewport (390×844, DPR 3) in Chromium with 4× CPU throttling, cold cache;
//   once without network throttling and once with "Slow 4G" (150 ms RTT, 1.6 Mbps down).
//   LCP, FCP and CLS from the browser's own PerformanceObservers; JS bytes from every script
//   response (gzip size computed here, so it doesn't depend on the server's compression), split
//   into "initial" (before the load event) and "after idle" (6 s later, which includes the lazy
//   3D chunk).
// - INP proxy: the longest Event Timing entry for three clicks (4× CPU).
// - scroll: a scripted top-to-bottom scroll at a constant 1,400 px/s driven by rAF; frames,
//   frame-time percentiles, dropped frames (> 25 ms), long tasks. Desktop 1440×900 unthrottled,
//   and phone 390×844 with 4× CPU.
// - booking: at 40 scroll positions, is a "Book a free consult call" link on screen and not
//   covered (elementFromPoint), and is one visible in the page content (not the header)?
// - fallbacks: WebGL off (--disable-webgl --disable-3d-apis) and reduced motion: canvases,
//   both CTAs, the still figures.
// - WebGL cleanup: five client-side visits to the route; renderer.info.memory of each renderer
//   once it is live, and again after navigating away (expect geometries and textures back to 0
//   and the context lost).
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.MEASURE_BASE ?? `http://localhost:${process.env.E2E_PORT ?? 3170}`;
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/experience/specimen", "/experience/synapse", "/experience/instrument", "/experience/slice"];
const OUT = ".local/shots/experience";
const GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
const iphone = { ...devices["iPhone 14"] };
delete iphone.defaultBrowserType;

const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : null);
const kb = (n) => Math.round((n / 1024) * 10) / 10;

const VITALS = () => {
  window.__v = { lcp: 0, cls: 0, fcp: 0, events: [], longtasks: [] };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__v.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__v.cls += e.value))).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => e.name === "first-contentful-paint" && (window.__v.fcp = e.startTime))).observe({ type: "paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__v.events.push(e.duration))).observe({ type: "event", buffered: true, durationThreshold: 16 });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__v.longtasks.push(e.duration))).observe({ type: "longtask", buffered: true });
};

async function load(browser, route, slow) {
  const ctx = await browser.newContext({ ...iphone });
  await ctx.addInitScript(VITALS);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (slow) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  }
  const scripts = [];
  let loaded = false;
  page.on("response", async (r) => {
    if (r.request().resourceType() !== "script") return;
    const phase = loaded ? "late" : "initial";
    try {
      const body = await r.body();
      scripts.push({ url: r.url(), phase, raw: body.length, gz: gzipSync(body).length });
    } catch {}
  });
  await page.goto(BASE + route, { waitUntil: "load", timeout: 120_000 });
  loaded = true;
  await page.waitForTimeout(6000);
  const v = await page.evaluate(() => window.__v);
  // INP proxy: three real clicks on things that respond (beat navigation, or the page body).
  const targets = page.locator("main button:visible");
  const n = Math.min(3, await targets.count());
  for (let i = 0; i < n; i++) {
    const t = targets.nth(i);
    if (await t.isVisible()) await t.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  const ev = await page.evaluate(() => window.__v.events);
  await ctx.close();
  const sum = (ph, k) => scripts.filter((s) => !ph || s.phase === ph).reduce((a, s) => a + s[k], 0);
  return {
    lcpMs: Math.round(v.lcp),
    fcpMs: Math.round(v.fcp),
    cls: Math.round(v.cls * 1000) / 1000,
    inpProxyMs: ev.length ? Math.round(Math.max(...ev)) : null,
    jsInitialGzKB: kb(sum("initial", "gz")),
    jsInitialParsedKB: kb(sum("initial", "raw")),
    jsTotalGzKB: kb(sum(null, "gz")),
    jsTotalParsedKB: kb(sum(null, "raw")),
    scripts: scripts.length,
    longTasksDuringLoad: v.longtasks.length,
  };
}

const SCROLL = (speed) =>
  new Promise((resolve) => {
    const frames = [];
    const longtasks = [];
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longtasks.push(e.duration)));
    po.observe({ type: "longtask" });
    const max = document.documentElement.scrollHeight - innerHeight;
    const t0 = performance.now();
    let last = t0;
    const step = (now) => {
      frames.push(now - last);
      last = now;
      const y = ((now - t0) / 1000) * speed;
      window.scrollTo(0, Math.min(max, y));
      if (y < max) requestAnimationFrame(step);
      else {
        po.disconnect();
        resolve({ seconds: (now - t0) / 1000, frames: frames.slice(1), longtasks });
      }
    };
    requestAnimationFrame(step);
  });

async function scroll(browser, route, phone, rate = 4) {
  const ctx = await browser.newContext(phone ? { ...iphone } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (phone) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await cdp.send("Performance.enable");
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForTimeout(5000); // let the lazy scene arm and draw
  const live = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const m0 = await metric();
  const r = await page.evaluate(SCROLL, 1400);
  const m1 = await metric();
  await ctx.close();
  // Main-thread busy time per second of scrolling (CDP TaskDuration is in seconds, unthrottled clock).
  const busy = (k) => Math.round(((m1[k] - m0[k]) / r.seconds) * 1000);
  const ft = r.frames;
  return {
    canvases: live,
    seconds: Math.round(r.seconds * 10) / 10,
    fps: Math.round((ft.length / r.seconds) * 10) / 10,
    p50FrameMs: Math.round(median(ft) * 10) / 10,
    p95FrameMs: Math.round(pct(ft, 0.95) * 10) / 10,
    droppedFrames: ft.filter((x) => x > 25).length,
    frames: ft.length,
    longTasks: r.longtasks.length,
    longestTaskMs: r.longtasks.length ? Math.round(Math.max(...r.longtasks)) : 0,
    mainThreadMsPerSec: busy("TaskDuration"),
    scriptMsPerSec: busy("ScriptDuration"),
  };
}

async function booking(browser, route, phone) {
  const ctx = await browser.newContext(phone ? { ...iphone } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const firstViewport = await page.evaluate(() =>
    [...document.querySelectorAll("a")].some((a) => /Book a free consult call/.test(a.textContent ?? "") && (() => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; })()),
  );
  const res = { any: 0, content: 0, n: 0, longestGapPx: 0 };
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let gapStart = null;
  for (let i = 0; i <= 40; i++) {
    const y = Math.round((max * i) / 40);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
    const vis = await page.evaluate(() => {
      const ok = (a) => {
        const r = a.getBoundingClientRect();
        if (r.width === 0 || r.bottom <= 0 || r.top >= innerHeight) return false;
        const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
        const yy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
        const hit = document.elementFromPoint(x, yy);
        return !!hit && (hit === a || a.contains(hit));
      };
      const links = [...document.querySelectorAll("a")].filter((a) => /Book a free consult call/.test(a.textContent ?? ""));
      return { any: links.some(ok), content: links.filter((a) => !a.closest("header")).some(ok) };
    });
    res.n++;
    if (vis.any) res.any++;
    if (vis.content) {
      res.content++;
      if (gapStart !== null) res.longestGapPx = Math.max(res.longestGapPx, y - gapStart);
      gapStart = null;
    } else if (gapStart === null) gapStart = y;
  }
  if (gapStart !== null) res.longestGapPx = Math.max(res.longestGapPx, max - gapStart);
  await ctx.close();
  return { firstViewport, anyVisiblePct: Math.round((res.any / res.n) * 100), inContentVisiblePct: Math.round((res.content / res.n) * 100), longestScrollWithoutInContentCtaPx: res.longestGapPx };
}

async function fallbacks(route) {
  const out = {};
  for (const [name, args, reduced] of [
    ["webglOff", ["--disable-webgl", "--disable-3d-apis"], false],
    ["reducedMotion", GPU, true],
  ]) {
    const b = await chromium.launch({ args });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    out[name] = await page.evaluate(() => ({
      canvases: document.querySelectorAll("canvas").length,
      bookLinks: [...document.querySelectorAll('a[href^="/book"]')].filter((a) => /Book a free consult call/.test(a.textContent ?? "")).length,
      secondaryLinks: [...document.querySelectorAll('main a[href="/dopamine"], main a[href="/mcat"]')].length,
      visibleFigures: [...document.querySelectorAll("main svg[role=img], main img")].filter((e) => e.getBoundingClientRect().width > 0).length,
      stageShown: [...document.querySelectorAll(".exp-story-stage")].some((e) => getComputedStyle(e).display !== "none"),
      textChars: document.querySelector("main")?.innerText.length ?? 0,
    }));
    out[name].pageErrors = errors.length;
    await b.close();
  }
  return out;
}

async function glCleanup(browser, route) {
  if (route === "/" || route.includes("instrument")) return null;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => (window.__glProbe = []));
  const page = await ctx.newPage();
  await page.goto(BASE + "/experience", { waitUntil: "load" });
  const visits = [];
  for (let i = 0; i < 5; i++) {
    // Client-side navigation, the way a visitor clicks: index → route → back to the index.
    await page.locator(`main a[href="${route}"]`).first().click();
    await page.waitForURL(`**${route}`);
    await page.waitForFunction(() => document.querySelector("[data-stage-ready=true]"), null, { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const live = await page.evaluate(() => {
      const p = window.__glProbe.at(-1);
      return p ? { ...p.gl.info.memory, programs: p.gl.info.programs?.length ?? null, contexts: window.__glProbe.length } : null;
    });
    await page.locator('footer a[href="/experience"]').click();
    await page.waitForURL("**/experience");
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => {
      const p = window.__glProbe.at(-1);
      return { ...p.gl.info.memory, contextLost: p.gl.getContext().isContextLost(), canvasesOnPage: document.querySelectorAll("canvas").length };
    });
    visits.push({ live, after });
  }
  await ctx.close();
  return visits;
}

async function axe(browser, route) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  await ctx.close();
  return violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length})`);
}

const results = { ranAt: new Date().toISOString(), base: BASE, build: "next build + next start (scripts/e2e-server.sh), Chromium headless with the Metal GPU, Apple M5", routes: {} };
const browser = await chromium.launch({ args: GPU });
for (const route of ROUTES) {
  console.log("measuring", route);
  const r = {};
  r.load = await load(browser, route, false);
  r.loadSlow4G = await load(browser, route, true);
  r.scrollDesktop = await scroll(browser, route, false);
  r.scrollPhone4x = await scroll(browser, route, true, 4);
  r.scrollPhone6x = await scroll(browser, route, true, 6);
  r.bookingPhone = await booking(browser, route, true);
  r.bookingDesktop = await booking(browser, route, false);
  r.fallbacks = await fallbacks(route);
  r.glCleanup = await glCleanup(browser, route);
  r.axe = await axe(browser, route);
  results.routes[route] = r;
  console.log(JSON.stringify(r));
}
await browser.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/measure.json`, JSON.stringify(results, null, 2));
console.log(`wrote ${OUT}/measure.json`);
