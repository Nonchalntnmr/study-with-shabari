import { devices, expect, test } from "@playwright/test";

// Layout: no horizontal overflow at the five widths, and on a 390×844 phone "Book a free consult
// call" is in the first viewport, links to the MCAT booking, and sits clear of the chat bubble's
// corner (bottom right) at every scroll position.

const PATHS = ["/experience", "/experience/specimen", "/experience/synapse", "/experience/instrument", "/experience/slice", "/experience/admissions"];
const WIDTHS = [360, 390, 768, 1280, 1440];

test("experience: no horizontal overflow at 360, 390, 768, 1280 and 1440", async ({ page }) => {
  test.setTimeout(180_000);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
    for (const p of PATHS) {
      await page.goto(p);
      for (const f of [0, 0.5, 1]) {
        await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
        await page.waitForTimeout(150);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, `${p} at ${w}px, scrolled ${f}`).toBeLessThanOrEqual(0);
      }
    }
  }
});

test.describe("phone", () => {
  // iPhone 14 viewport, density, touch and user agent, in Chromium.
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["iPhone 14"].userAgent });

  test("experience: the consult CTA is in the first viewport, always on screen, and clear of the chat bubble", async ({ page }) => {
    test.setTimeout(120_000);
    for (const p of PATHS.slice(1)) {
      await page.goto(p);
      const cta = page.locator("header [data-book-cta]");
      await expect(cta).toBeInViewport({ ratio: 1 });
      await expect(cta).toHaveAttribute("href", p.endsWith("admissions") ? "/book?service=admissions" : "/book?service=mcat");
      const vp = page.viewportSize()!;
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
        await page.waitForTimeout(150);
        await expect(cta, `${p} scrolled ${f}`).toBeInViewport({ ratio: 1 });
        const box = (await cta.boundingBox())!;
        // The IONOS bubble is fixed at the bottom right; keep every CTA out of a 100×100 corner.
        const inCorner = box.x + box.width > vp.width - 100 && box.y + box.height > vp.height - 100;
        expect(inCorner, `${p}: CTA in the chat bubble's corner`).toBe(false);
        // Nothing covers it.
        const hit = await cta.evaluate((a) => {
          const r = a.getBoundingClientRect();
          const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!el && (el === a || a.contains(el));
        });
        expect(hit, `${p}: CTA covered at ${f}`).toBe(true);
      }
    }
  });
});
