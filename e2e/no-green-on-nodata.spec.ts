import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

/**
 * Honesty invariant: when a hazard with very low coverage is active, the
 * no-data buildings must be rendered grey (with diagonal hatch) — they must
 * NOT be rendered green. We assert this by sampling the rendered map canvas:
 * for inland_flood (Shibuya has covered_count=0), the entire painted-building
 * surface should contain at most a trivial number of "safe green" pixels.
 *
 * Run this with a real artifact directory symlinked into public/artifacts/shibuya.
 */
test.describe("no-data must never be green", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Race: manifest fetch either succeeds (canvas appears) or fails (error
    // banner appears). Without this wait, WebKit could check `isVisible`
    // before the fetch resolved and incorrectly proceed into the test body
    // while the SPA was still loading.
    await Promise.race([
      page
        .getByText(/Failed to load manifest/)
        .waitFor({ state: "visible", timeout: 20_000 }),
      page
        .locator("canvas.maplibregl-canvas")
        .waitFor({ state: "visible", timeout: 20_000 }),
    ]).catch(() => undefined);
    const errorBanner = page.getByText(/Failed to load manifest/);
    if (await errorBanner.isVisible().catch(() => false)) {
      test.skip(true, "manifest not available — symlink artifacts to enable");
    }
  });

  test("inland_flood (0% coverage in Shibuya) shows no safe-green", async ({ page }) => {
    // Activate only inland_flood; Shibuya's coverage_stats reports covered=0.
    await page.getByRole("checkbox", { name: "River flood" }).uncheck();
    await page.getByRole("checkbox", { name: "Inland flood" }).check();

    // Wait for tiles + paint to settle.
    await page.waitForTimeout(2000);

    const screenshotPath = test.info().outputPath("inland_flood.png");
    await page.locator("canvas.maplibregl-canvas").screenshot({ path: screenshotPath });

    const { greenPixels, sampled } = await sampleGreenPixels(screenshotPath);
    // The "safe" green swatch (#2E7D32) should never appear on no-data.
    // Allow trace amount for anti-aliasing on legend swatch.
    expect(
      greenPixels / sampled,
      `green ratio ${greenPixels}/${sampled} (=${(greenPixels / sampled).toFixed(4)}) — covered=false should not be green`,
    ).toBeLessThan(0.001);
  });
});

import { promises as fsp } from "node:fs";

async function sampleGreenPixels(path: string): Promise<{ greenPixels: number; sampled: number }> {
  const buf = await fsp.readFile(path);
  const png = PNG.sync.read(buf);
  let greenPixels = 0;
  let sampled = 0;
  // Walk the central 80% to skip legend swatches at the edges.
  const xStart = Math.floor(png.width * 0.1);
  const xEnd = Math.floor(png.width * 0.9);
  const yStart = Math.floor(png.height * 0.1);
  const yEnd = Math.floor(png.height * 0.9);
  for (let y = yStart; y < yEnd; y += 2) {
    for (let x = xStart; x < xEnd; x += 2) {
      const i = (y * png.width + x) << 2;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      sampled += 1;
      // Safe green is #2E7D32 = (46, 125, 50). Match a tight neighborhood.
      if (
        Math.abs(r - 46) < 30 &&
        Math.abs(g - 125) < 40 &&
        Math.abs(b - 50) < 30 &&
        g > r &&
        g > b
      ) {
        greenPixels += 1;
      }
    }
  }
  return { greenPixels, sampled };
}
