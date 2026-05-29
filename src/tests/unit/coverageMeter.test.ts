import { describe, expect, it, vi } from "vitest";
import type maplibregl from "maplibre-gl";
import { CoverageMeter } from "@/coverage/CoverageMeter";
import { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { PipelineManifest } from "@/types/manifest";

function fakeManifest(): PipelineManifest {
  return {
    attribution: "© Project PLATEAU / MLIT (CC BY 4.0)",
    tool: "plateau-bridge",
    tool_version: "0.1.0",
    generated_at: "2026-05-26T07:22:13Z",
    city_code: "13113",
    city_name: "Shibuya-ku",
    dataset_year: 2023,
    n_buildings: 41829,
    datasets: [],
    sources: {},
    coverage_stats: [
      { kind: "river_flood", covered_count: 28921, hit_count: 28921, coverage_confidence_breakdown: { unknown: 12908, inundation_bounded: 28921 } },
      { kind: "inland_flood", covered_count: 0, hit_count: 0 },
      { kind: "tsunami", covered_count: 0, hit_count: 0 },
      { kind: "storm_surge", covered_count: 0, hit_count: 0 },
      { kind: "landslide", covered_count: 36, hit_count: 36 },
    ],
    field_coverage: {
      year_built: 0.0,
      structure: 0.5,
      usage: 1.0,
    },
  };
}

function fakeMap(features: Array<{ properties: Record<string, unknown> }> = []) {
  return {
    queryRenderedFeatures: vi.fn(() => features),
  } as unknown as maplibregl.Map;
}

describe("CoverageMeter.getCityCoverage", () => {
  it("reads totals and ratios from the manifest", () => {
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(), reg);
    const city = meter.getCityCoverage();

    expect(city.buildingsTotal).toBe(41829);
    expect(city.fields.year_built).toBe(0);
    expect(city.fields.usage).toBe(1);

    expect(city.hazards.river_flood.coveredCount).toBe(28921);
    expect(city.hazards.river_flood.coveredRatio).toBeCloseTo(28921 / 41829, 4);
    expect(city.hazards.inland_flood.coveredCount).toBe(0);
    expect(city.hazards.landslide.coveredCount).toBe(36);
  });

  it("returns zero ratio when manifest has zero buildings", () => {
    const manifest = { ...fakeManifest(), n_buildings: 0 };
    const reg = new ManifestRegistry(manifest);
    const meter = new CoverageMeter(fakeMap(), reg);
    const city = meter.getCityCoverage();
    expect(city.hazards.river_flood.coveredRatio).toBe(0);
  });
});

describe("CoverageMeter.getViewportCoverage", () => {
  it("dedupes by building_uid and tallies per-hazard buckets", () => {
    const features = [
      // Two duplicates of building A: must count as 1.
      { properties: { building_uid: "A", year_built: 1985, structure: "wood", river_flood_covered: true, river_flood_coverage_confidence: "explicit_polygon" } },
      { properties: { building_uid: "A", year_built: 1985, structure: "wood", river_flood_covered: true, river_flood_coverage_confidence: "explicit_polygon" } },
      // Building B: no_data
      { properties: { building_uid: "B", river_flood_covered: false } },
      // Building C: low confidence
      { properties: { building_uid: "C", river_flood_covered: true, river_flood_coverage_confidence: "unknown" } },
    ];
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(features), reg);
    const v = meter.getViewportCoverage(["dummy-layer-id"]);

    expect(v.buildings).toBe(3);
    expect(v.yearKnown).toBe(1);
    expect(v.structureKnown).toBe(1);
    expect(v.perHazard.river_flood.covered).toBe(1);
    expect(v.perHazard.river_flood.noData).toBe(1);
    expect(v.perHazard.river_flood.lowConfidence).toBe(1);
  });

  it("returns zeros when no layers are active", () => {
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(), reg);
    const v = meter.getViewportCoverage([]);
    expect(v.buildings).toBe(0);
    expect(v.yearKnown).toBe(0);
  });

  it("missing confidence (PMTiles-stripped) is bucketed as covered", () => {
    // tippecanoe strips *_coverage_confidence to save MVT bytes; the SPA
    // treats absence as "trust the covered verdict" because the pipeline
    // still computed it from the same polygons. See HazardField doc.
    const features = [
      { properties: { building_uid: "D", river_flood_covered: true } },
    ];
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(features), reg);
    const v = meter.getViewportCoverage(["x"]);
    expect(v.perHazard.river_flood.covered).toBe(1);
    expect(v.perHazard.river_flood.lowConfidence).toBe(0);
  });

  it("explicit null confidence is bucketed as low_confidence", () => {
    const features = [
      { properties: { building_uid: "E", river_flood_covered: true, river_flood_coverage_confidence: null } },
    ];
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(features), reg);
    const v = meter.getViewportCoverage(["x"]);
    expect(v.perHazard.river_flood.lowConfidence).toBe(1);
    expect(v.perHazard.river_flood.covered).toBe(0);
  });

  it("ignores features without building_uid", () => {
    const features = [{ properties: { not_a_building: true } }];
    const reg = new ManifestRegistry(fakeManifest());
    const meter = new CoverageMeter(fakeMap(features), reg);
    expect(meter.getViewportCoverage(["x"]).buildings).toBe(0);
  });
});
