import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Post-deploy checks (redirects, HTTPS) run only when pointed at a live URL.
const live = process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: live ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: live
    ? [{ name: "post-deploy", testMatch: /post-deploy\.spec\.ts/, use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "desktop", testIgnore: /(post-deploy|journey-mobile)\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", testMatch: /(^|\/)mobile\.spec\.ts/, use: { ...devices["Pixel 7"] } },
        // iPhone 14 viewport, touch and user agent, rendered in Chromium (WebKit isn't installed here).
        { name: "journey", testMatch: /journey-mobile\.spec\.ts/, use: { ...devices["iPhone 14"], browserName: "chromium" } },
      ],
  webServer: live
    ? undefined
    : {
        command: "bash scripts/e2e-server.sh",
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
