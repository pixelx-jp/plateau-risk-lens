import { expect, test } from "@playwright/test";

test("app boots and renders the map header", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  // Either the title renders, or we see the explicit "Failed to load manifest"
  // error. Both are valid app states; we just need to make sure the app
  // doesn't crash to a blank screen.
  await expect(page.locator("body")).toContainText(
    /PLATEAU Risk Lens|Failed to load manifest/,
  );

  // Filter out network errors for missing artifacts in dev mode without
  // symlinks — those are expected when running smoke without a fixture.
  const fatal = errors.filter((e) => !/manifest\.json|404|Failed to fetch/i.test(e));
  expect(fatal).toEqual([]);
});

test("language toggle switches to Japanese", async ({ page }) => {
  await page.goto("/");

  // Skip if manifest didn't load (artifact symlinks absent in this run).
  const errorBanner = page.getByText(/Failed to load manifest/);
  if (await errorBanner.isVisible().catch(() => false)) {
    test.skip(true, "manifest not available — symlink artifacts to enable");
  }

  await page.getByRole("button", { name: "JA" }).click();
  await expect(page.getByText("PLATEAU リスクレンズ")).toBeVisible();
});
