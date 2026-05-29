import { describe, expect, it } from "vitest";
import { buildOverlayModel } from "@/export/buildOverlay";
import { I18n } from "@/i18n/I18n";
import { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { PipelineManifest } from "@/types/manifest";

const FAKE_MANIFEST = new ManifestRegistry({
  attribution: "© Project PLATEAU / MLIT (CC BY 4.0)",
  tool: "plateau-bridge",
  tool_version: "0.1.0",
  generated_at: "2026-05-28T00:00:00Z",
  city_code: "13113",
  city_name: "Shibuya-ku",
  dataset_year: 2023,
  n_buildings: 41829,
  datasets: [],
  sources: {
    "plateau-13113-shibuya-ku-2023-fld": {
      source_id: "plateau-13113-shibuya-ku-2023-fld",
      dataset_id: "plateau-13113-shibuya-ku-2023-fld",
      year: 2023,
    },
    "plateau-13113-shibuya-ku-2023-tnm": {
      source_id: "plateau-13113-shibuya-ku-2023-tnm",
      dataset_id: "plateau-13113-shibuya-ku-2023-tnm",
      year: 2023,
    },
  },
  coverage_stats: [
    { kind: "river_flood", covered_count: 28921, hit_count: 28921 },
    { kind: "tsunami", covered_count: 0, hit_count: 0 },
  ],
  field_coverage: {},
} satisfies PipelineManifest);

describe("buildOverlayModel", () => {
  it("always includes no-data and safe legend entries", () => {
    const model = buildOverlayModel({
      activeHazards: [],
      i18n: new I18n("en"),
      manifest: FAKE_MANIFEST,
      now: new Date("2026-05-28T12:00:00Z"),
    });
    const labels = model.legendItems.map((it) => it.label);
    expect(labels.some((l) => /No data/i.test(l))).toBe(true);
    expect(labels.some((l) => /Covered, no risk/i.test(l))).toBe(true);
  });

  it("includes attribution and disclaimer", () => {
    const model = buildOverlayModel({
      activeHazards: ["river_flood"],
      i18n: new I18n("en"),
      manifest: FAKE_MANIFEST,
      now: new Date("2026-05-28T12:00:00Z"),
    });
    expect(model.attributionLines.join(" ")).toMatch(/PLATEAU/);
    expect(model.disclaimer).toMatch(/Static/i);
    expect(model.timestamp).toBe("2026-05-28T12:00:00.000Z");
  });

  it("adds depth bands for active depth-based hazards", () => {
    const model = buildOverlayModel({
      activeHazards: ["river_flood"],
      i18n: new I18n("en"),
      manifest: FAKE_MANIFEST,
      now: new Date(),
    });
    expect(model.legendItems.some((it) => /River flood.*m/.test(it.label))).toBe(true);
  });

  it("renders Japanese labels", () => {
    const model = buildOverlayModel({
      activeHazards: ["tsunami"],
      i18n: new I18n("ja"),
      manifest: FAKE_MANIFEST,
      now: new Date(),
    });
    expect(model.legendItems.some((it) => /津波/.test(it.label))).toBe(true);
    expect(model.disclaimer).toMatch(/リアルタイム/);
  });
});
