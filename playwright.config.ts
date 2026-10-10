import { defineConfig } from "@playwright/test";

/**
 * End-to-end checks against the Astro dev server (`npm run dev`).
 * Run with `npm run test:e2e`. Uses the local JSON store (no Upstash vars) and the
 * dev-only seed route, so it never touches production data.
 */
export default defineConfig({
  testDir: "e2e",
  // Both projects share one dev server + data file, so run serially.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4321",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321/dj/requests",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 900 } } },
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
});
