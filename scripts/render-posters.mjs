// Renders the static fallbacks of the 3D model from the live scene (dev server must be running).
//   node scripts/render-posters.mjs http://localhost:3001
// Writes public/images/dopamine-model.png (full stage) and dopamine-model-tight.png (cropped).
import { chromium } from "@playwright/test";
import sharp from "sharp";

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
// The tight poster is the model itself plus a margin, found from the pixels rather than a fixed crop.
const trimmed = await sharp("public/images/dopamine-model.png").trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
const pad = Math.round(Math.max(trimmed.info.width, trimmed.info.height) * 0.06);
await sharp(trimmed.data)
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile("public/images/dopamine-model-tight.png");
await b.close();
console.log("posters written");
