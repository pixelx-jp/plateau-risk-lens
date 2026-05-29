/**
 * Generate per-city OG preview PNGs by driving the running app with
 * Playwright's headless Chromium. Each image triggers the in-app PNG export
 * (which carries attribution + disclaimer + timestamp), so the OG preview
 * matches what users would themselves export — same view model, same
 * honesty rules, no separate "marketing" rendering path.
 *
 * Usage:
 *   npm run dev              # in one terminal, with artifacts symlinked
 *   npx tsx scripts/generate-og-images.ts
 *
 * Output: public/og/<slug>.png  (1200x630, suitable for og:image)
 */
import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface City {
  slug: string;
  label: string;
  hazards: string[];
}

const CITIES: City[] = [
  { slug: "shibuya", label: "Shibuya", hazards: ["River flood"] },
  { slug: "edogawa", label: "Edogawa", hazards: ["River flood", "Tsunami"] },
  { slug: "koto", label: "Koto", hazards: ["Storm surge", "Tsunami"] },
  { slug: "kamakura", label: "Kamakura", hazards: ["Tsunami", "Landslide"] },
  { slug: "osaka", label: "Osaka", hazards: ["River flood"] },
];

const BASE_URL = process.env.OG_BASE_URL ?? "http://localhost:5173";
const OUT_DIR = path.resolve("public/og");

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const city of CITIES) {
      await renderCity(browser, city);
    }
  } finally {
    await browser.close();
  }
}

async function renderCity(
  browser: import("playwright").Browser,
  city: City,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.error(`[${city.slug}] page error:`, err));

  await page.goto(BASE_URL);
  // Wait for manifest + first PMTiles paint.
  await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 15_000 });

  // Switch to the target city. Page key in <MapStage> remounts the map.
  await page.locator("select").first().selectOption(city.slug);
  await page.waitForTimeout(1500);

  const ALL_HAZARDS = [
    "River flood",
    "Inland flood",
    "Tsunami",
    "Storm surge",
    "Landslide",
  ];
  for (const label of ALL_HAZARDS) {
    const cb = page.getByRole("checkbox", { name: label });
    if (await cb.isChecked()) await cb.setChecked(false);
  }
  for (const label of city.hazards) {
    await page.getByRole("checkbox", { name: label }).setChecked(true);
  }

  // Let MapLibre settle on the new city + hazards.
  await page.waitForTimeout(5000);

  const tmp = path.join(OUT_DIR, `_${city.slug}_raw.png`);
  await page.screenshot({ path: tmp, fullPage: false });
  await context.close();

  // Resize to OG aspect (1200x630, fit=cover).
  const outPath = path.join(OUT_DIR, `${city.slug}.png`);
  await sharp(tmp).resize(1200, 630, { fit: "cover" }).png().toFile(outPath);
  await fs.unlink(tmp);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
