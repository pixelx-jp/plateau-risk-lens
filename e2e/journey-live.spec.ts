import { expect, test } from "@playwright/test";

/**
 * Live user-journey check (run against production, not the default dev server):
 *
 *   E2E_BASE_URL=https://risk-lens.plateau.yodolabs.jp \
 *     npx playwright test journey-live --project=chromium
 *
 * Validates the end-to-end chain for the 5 newly-added regional metros:
 * picker exposes them → selecting one fetches its pmtiles from the R2 origin
 * (200/206) → the MapLibre canvas renders without fatal errors.
 */

const NEW_CITIES = [
  { slug: "yokohama", label: "Yokohama" },
  { slug: "osaka", label: "Osaka" },
  { slug: "nagoya", label: "Nagoya" },
  { slug: "fukuoka", label: "Fukuoka" },
  { slug: "sapporo", label: "Sapporo" },
];

test("picker exposes all 29 cities incl. the 5 new metros", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas.maplibregl-canvas").waitFor({ state: "visible", timeout: 30_000 });

  const select = page.locator("select").first();
  const values = await select.locator("option").evaluateAll((opts) =>
    opts.map((o) => (o as HTMLOptionElement).value),
  );
  for (const { slug } of NEW_CITIES) {
    expect(values, `picker should contain ${slug}`).toContain(slug);
  }
  // 23 wards + Kamakura + 5 metros
  expect(values.length).toBeGreaterThanOrEqual(29);
});

for (const { slug, label } of NEW_CITIES) {
  test(`journey: select ${label} → pmtiles loads from R2 → map renders`, async ({ page }) => {
    const fatal: string[] = [];
    page.on("pageerror", (e) => fatal.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !/404|Failed to fetch/i.test(m.text())) fatal.push(m.text());
    });

    await page.goto("/");
    await page.locator("canvas.maplibregl-canvas").waitFor({ state: "visible", timeout: 30_000 });

    // Watch for this city's pmtiles being fetched from the artifacts origin.
    const pmtilesOk = page.waitForResponse(
      (r) =>
        r.url().includes(`/${slug}/buildings.pmtiles`) &&
        (r.status() === 200 || r.status() === 206),
      { timeout: 30_000 },
    );

    await page.locator("select").first().selectOption(slug);

    const resp = await pmtilesOk;
    expect(resp.url()).toContain(`artifacts.plateau.yodolabs.jp/${slug}/buildings.pmtiles`);

    // Give MapLibre a moment to draw the first frame, then snapshot.
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `e2e/.journey/${slug}.png` });

    // Loading the pmtiles is not enough — assert buildings actually render at
    // the city's default zoom. (A too-low default zoom sits below the building
    // layer's minzoom and paints an empty map even though the data loaded.)
    const body = await page.locator("body").innerText();
    const drawn = Number((body.match(/Viewport rendered\s+Buildings:\s*([\d,]+)/i)?.[1] ?? "0").replace(/,/g, ""));
    expect(drawn, `${label} should render buildings at its default zoom`).toBeGreaterThan(0);

    expect(fatal, `no fatal console/page errors for ${label}`).toEqual([]);
  });
}
