// Renders the static fallbacks of the 3D model from the live scene (dev server must be running).
//   node scripts/render-posters.mjs http://localhost:3001
// Writes public/images/dopamine-model.png (full stage) and dopamine-model-tight.png (cropped).
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3001";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
// Only the canvas, on a transparent page.
await p.addStyleTag({
  content: `html, body, .public, main { background: transparent !important; }
            body * { visibility: hidden !important; }
            [data-stage], [data-stage] canvas, [data-stage] canvas * { visibility: visible !important; }
            [data-stage] img { display: none !important; }`,
});
await p.waitForTimeout(400);
await p.screenshot({ path: "public/images/dopamine-model.png", omitBackground: true });
await p.screenshot({ path: "public/images/dopamine-model-tight.png", omitBackground: true, clip: { x: 590, y: 220, width: 820, height: 560 } });
await b.close();
console.log("posters written");
