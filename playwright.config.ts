import { defineConfig, devices } from "@playwright/test";

// Browsers to run against. The honesty visual regression must hold across
// engines because canvas rendering differs (color quantization, font
// hinting). Default to Chromium-only locally for speed; CI runs all three.
const browsers = process.env.E2E_BROWSER_MATRIX === "all" || process.env.CI
  ? [
      { name: "chromium", use: devices["Desktop Chrome"] },
      { name: "firefox", use: devices["Desktop Firefox"] },
      { name: "webkit", use: devices["Desktop Safari"] },
    ]
  : [{ name: "chromium", use: devices["Desktop Chrome"] }];

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  projects: browsers,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // In CI, run against the static prod build (faster + more representative).
        // Locally, prefer `npm run dev` for HMR.
        command: process.env.CI
          ? "npm run build && npm run preview -- --port 5173 --strictPort"
          : "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
