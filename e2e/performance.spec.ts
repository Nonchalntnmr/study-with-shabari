import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { chromium, devices, expect, test, type Page } from "@playwright/test";
import { ADMIN, E2E_DB_URL, signIn, sql } from "./helpers";

// Measured, not claimed: exam runner performance on the production build with a
// full-length-sized set (59 questions, 95 minutes, one 3,000-word passage), on
// desktop, a throttled phone, a slow network and a slow server, plus WebGL off,
// reduced motion, and the exam with the homepage's 3D assets blocked.
// Numbers go to ~/projects/study-with-shabari/.local/shots/m2/perf.json.

const OUT = process.env.M2_SHOTS_DIR ? path.dirname(process.env.M2_SHOTS_DIR) : path.join(homedir(), "projects/study-with-shabari/.local/shots/m2");
const SLUG = "perf-full-length-cp";
const N = 59;
const m: Record<string, unknown> = {};

const words = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => ["buffer", "enzyme", "membrane", "gradient", "kinetics", "equilibrium", "titration", "protein"][(i * 7 + seed) % 8]).join(" ");
const paragraph = (n: number, seed: number) => `${words(n, seed)}.`.replace(/^./, (c) => c.toUpperCase());
const passageBody = (totalWords: number, seed: number) => Array.from({ length: 6 }, (_, p) => paragraph(Math.round(totalWords / 6), seed + p)).join("\n\n");

function bank() {
  const q = (id: string) => ({
    id,
    stem: `Question ${id}: which statement about the system described is best supported?`,
    choices: ["A", "B", "C", "D"].map((label, i) => ({ label, text: `Option ${label} for ${id}`, correct: i === 1, rationale: `Why ${label} for ${id}.` })),
    explanation: `Worked explanation for ${id}.`,
    topics: ["perf-topic"],
  });
  const items: unknown[] = [];
  let n = 0;
  for (let p = 0; p < 6; p++) {
    items.push({ type: "passage", id: `perf-p${p}`, title: `Performance passage ${p + 1}`, body: passageBody(p === 0 ? 3000 : 600, p), questions: Array.from({ length: 9 }, () => q(`perf-q${n++}`)) });
  }
  while (n < N) items.push({ type: "discrete", ...q(`perf-q${n++}`) });
  return {
    version: 1,
    topics: [{ slug: "perf-topic", name: "Performance topic", section: "CP" }],
    exams: [{ slug: SLUG, title: "Performance full-length (test only)", description: "Generated for performance measurement.", section: "CP", timeLimitMinutes: 95, items }],
  };
}

async function startPerfSet(page: Page) {
  await page.goto(`/practice/${SLUG}`);
  await page.getByLabel(/^Timed/).check();
  const t0 = Date.now();
  await page.getByRole("button", { name: "Start practice set" }).click();
  await expect(page.getByText(`Question 1 of ${N}`)).toBeVisible({ timeout: 60_000 });
  return Date.now() - t0;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function switchTimes(page: Page, count: number) {
  const times: number[] = [];
  for (let i = 1; i <= count; i++) {
    const t0 = Date.now();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(`Question ${i + 1} of ${N}`)).toBeVisible();
    times.push(Date.now() - t0);
  }
  return { medianMs: median(times), maxMs: Math.max(...times) };
}

async function answerToSaved(page: Page, label: string) {
  const t0 = Date.now();
  await page.locator("label", { has: page.getByRole("radio", { name: new RegExp(`^${label}\\. `) }) }).click();
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 60_000 });
  return Date.now() - t0;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  // Through the same import CLI admins use, into the throwaway E2E database only.
  const file = path.join(tmpdir(), `sws-perf-bank-${process.pid}.json`);
  writeFileSync(file, JSON.stringify(bank()));
  execFileSync("npx", ["tsx", "scripts/import-content.ts", file, "--status", "PUBLISHED"], { env: { ...process.env, DATABASE_URL: E2E_DB_URL, DIRECT_URL: E2E_DB_URL }, stdio: "pipe" });
  mkdirSync(OUT, { recursive: true });
});

// The CLI import runs outside the server, so the public catalogue cache (refreshed within minutes) doesn't know
// about the set yet. Publishing it from the admin page refreshes that cache at once, as it would for Shabari.
test.beforeAll(async ({ browser }) => {
  await sql(`UPDATE "Exam" SET status = 'DRAFT' WHERE slug = $1`, [SLUG]);
  const [exam] = await sql<{ id: string }>(`SELECT id FROM "Exam" WHERE slug = $1`, [SLUG]);
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, ADMIN.email, ADMIN.password, `/admin/exams/${exam.id}`);
  await admin.getByLabel("Status").selectOption("PUBLISHED");
  await admin.getByRole("button", { name: "Set status" }).click();
  await expect(admin.getByRole("status").filter({ hasText: /published/i })).toBeVisible();
  await admin.context().close();
});

test.afterAll(async () => {
  // Keep the shared E2E catalogue as the other specs expect it.
  await sql(`UPDATE "Exam" SET status = 'DRAFT' WHERE slug = $1`, [SLUG]);
  writeFileSync(path.join(OUT, "perf.json"), JSON.stringify({ ranAt: new Date().toISOString(), build: "next build + next start, local machine, Chromium", measurements: m }, null, 2));
  console.log(JSON.stringify(m, null, 2));
});

test("desktop: full-length set with a 3,000-word passage", async ({ page }) => {
  m.desktopStartToFirstQuestionMs = await startPerfSet(page);
  // A direct load of the runner: the whole 59-question set and its passages arrive in this document.
  const t0r = Date.now();
  await page.reload();
  await expect(page.getByText(`Question 1 of ${N}`)).toBeVisible();
  m.desktopRunnerReloadToFirstQuestionMs = Date.now() - t0r;
  m.desktopRunnerDocument = await page.evaluate(() => {
    const e = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return e ? { transferBytes: e.transferSize, decodedBytes: e.decodedBodySize, domContentLoadedMs: Math.round(e.domContentLoadedEventEnd - e.startTime) } : null;
  });
  m.desktopQuestionSwitch = await switchTimes(page, 15);
  // Highlight across most of the big passage.
  await page.getByRole("button", { name: "Navigator" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Question 1,/ }).click();
  const t0 = Date.now();
  await page.evaluate(() => {
    const paras = document.querySelectorAll('[data-passage-text] [data-p]');
    const r = document.createRange();
    r.setStart(paras[0].firstChild!.firstChild!, 0);
    const last = paras[paras.length - 1].firstChild!.firstChild!;
    r.setEnd(last, Math.min(200, last.textContent!.length));
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.locator("[data-passage-text] mark.exam-hl").first()).toBeVisible();
  m.desktopHighlightWholePassageMs = Date.now() - t0;
  m.desktopAnswerToSavedMs = await answerToSaved(page, "B");
});

test("phone: iPhone 14 viewport with 4x CPU throttling", async ({ browser }) => {
  // iPhone 14 viewport, touch and user agent, rendered in Chromium (WebKit isn't installed here).
  const iphone: Partial<(typeof devices)["iPhone 14"]> = { ...devices["iPhone 14"] };
  delete iphone.defaultBrowserType;
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  m.phoneStartToFirstQuestionMs = await startPerfSet(page);
  await page.getByRole("button", { name: "question", exact: true }).click();
  m.phoneQuestionSwitch = await switchTimes(page, 8);
  m.phoneAnswerToSavedMs = await answerToSaved(page, "C");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});

test("slow network: 400 ms latency, 400 kbps", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 50_000 });
  m.slowNetworkStartToFirstQuestionMs = await startPerfSet(page);
  m.slowNetworkAnswerToSavedMs = await answerToSaved(page, "A");
  await ctx.close();
});

test("slow server: autosave takes 3 s, the page stays responsive and nothing is lost", async ({ page }) => {
  await startPerfSet(page);
  await page.route("**/api/attempts/*/sync", async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.locator("label", { has: page.getByRole("radio", { name: /^A\. / }) }).click();
  await page.waitForTimeout(700); // the save is now in flight
  const t0 = Date.now();
  await page.locator("label", { has: page.getByRole("radio", { name: /^D\. / }) }).click();
  await expect(page.getByRole("radio", { name: /^D\. / })).toBeChecked();
  m.slowServerInputResponseMs = Date.now() - t0;
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(`Question 2 of ${N}`)).toBeVisible();
  m.slowServerNavigationWhileSavingMs = Date.now() - t0;
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 20_000 });
  const id = page.url().split("/exam/")[1];
  const [row] = await sql<{ label: string }>(`SELECT c.label FROM "Response" r JOIN "Choice" c ON c.id = r."selectedChoiceId" WHERE r."attemptId" = $1 AND r."questionId" = (SELECT "questionOrder"[1] FROM "Attempt" WHERE id = $1)`, [id]);
  expect(row.label).toBe("D");
});

test("WebGL off and reduced motion: static homepage, and the exam still works", async ({ baseURL }) => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const ctx = await b.newContext({ baseURL, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForTimeout(1500);
  m.noWebglHomepageCanvases = await page.locator("canvas").count();
  expect(m.noWebglHomepageCanvases).toBe(0);
  m.reducedMotionScoreBarsDrawn = await page.evaluate(() => [...document.querySelectorAll("[data-bar]")].every((el) => getComputedStyle(el).transform === "none"));
  expect(m.reducedMotionScoreBarsDrawn).toBe(true);
  await startPerfSet(page);
  await answerToSaved(page, "B");
  expect(errors).toEqual([]);
  await b.close();
});

test("the exam works when the homepage's 3D and poster assets fail to load", async ({ page }) => {
  // Learn which scripts only the homepage's 3D scene needs.
  const homeScripts = new Set<string>();
  page.on("request", (r) => r.resourceType() === "script" && homeScripts.add(r.url()));
  await page.goto("/");
  await page.waitForTimeout(3000);
  const examScripts = new Set<string>();
  page.removeAllListeners("request");
  page.on("request", (r) => r.resourceType() === "script" && examScripts.add(r.url()));
  await page.goto(`/practice/${SLUG}`);
  const homeOnly = [...homeScripts].filter((u) => !examScripts.has(u));
  m.homepageOnlyScriptsBlocked = homeOnly.length;
  await page.route(/\/images\/dopamine-model|\.(glb|hdr)$/, (r) => r.abort());
  for (const u of homeOnly) await page.route(u, (r) => r.abort());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await startPerfSet(page);
  await answerToSaved(page, "C");
  expect(errors).toEqual([]);
});
