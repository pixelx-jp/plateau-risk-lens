import { describe, expect, it } from "vitest";
import { buildPropertyCard } from "@/map/interaction/FeaturePicker";
import { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { HAZARD_KEYS } from "@/types/hazard";
import { toHazardStatus } from "@/hazard/hazardClassification";
import type { FeatureProps } from "@/types/feature";
import type { PipelineManifest } from "@/types/manifest";

function manifest(): ManifestRegistry {
  const m: PipelineManifest = {
    attribution: "© Project PLATEAU / MLIT (CC BY 4.0)",
    tool: "plateau-bridge",
    tool_version: "0.1.0",
    generated_at: "2026-05-26T07:22:13Z",
    city_code: "13113",
    city_name: "Shibuya-ku",
    dataset_year: 2023,
    n_buildings: 41829,
    datasets: [],
    sources: {
      A: { source_id: "A", dataset_id: "plateau-13113-shibuya-ku-2023-fld", year: 2023 },
      B: { source_id: "B", dataset_id: "plateau-13113-shibuya-ku-2023-lsld", year: 2023 },
      C: { source_id: "C", dataset_id: "plateau-13113-shibuya-ku-2023-tnm", year: 2023 },
    },
    coverage_stats: [],
    field_coverage: {},
  };
  return new ManifestRegistry(m);
}

function picked(props: FeatureProps) {
  return {
    props,
    hazards: HAZARD_KEYS.map((k) => toHazardStatus(props, k)),
  };
}

describe("buildPropertyCard", () => {
  it("splits coverage sources from hit sources", () => {
    const props: FeatureProps = {
      building_uid: "b1",
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_coverage_source_ids: "A,B",
      river_flood_hit_source_ids: "A",
      river_flood_depth_max: 2,
    };
    const view = buildPropertyCard(picked(props), manifest());
    expect(view.coverageSources.map((e) => e.source_id).sort()).toEqual(["A", "B"]);
    expect(view.hitSources.map((e) => e.source_id)).toEqual(["A"]);
  });

  it("dedupes source ids across hazard fields", () => {
    const props: FeatureProps = {
      building_uid: "b2",
      river_flood_covered: true,
      river_flood_coverage_source_ids: "A",
      river_flood_hit_source_ids: "A",
      tsunami_covered: true,
      tsunami_coverage_source_ids: "C,A",
      tsunami_hit_source_ids: "C",
    };
    const view = buildPropertyCard(picked(props), manifest());
    expect(view.coverageSources.map((e) => e.source_id).sort()).toEqual(["A", "C"]);
    expect(view.hitSources.map((e) => e.source_id).sort()).toEqual(["A", "C"]);
  });

  it("returns empty lists when no source_ids present", () => {
    const view = buildPropertyCard(picked({ building_uid: "b3" }), manifest());
    expect(view.coverageSources).toEqual([]);
    expect(view.hitSources).toEqual([]);
  });

  it("ignores unknown source ids silently (defensive)", () => {
    const props: FeatureProps = {
      building_uid: "b4",
      river_flood_covered: true,
      river_flood_coverage_source_ids: "A,NONEXISTENT",
    };
    const view = buildPropertyCard(picked(props), manifest());
    expect(view.coverageSources.map((e) => e.source_id)).toEqual(["A"]);
  });

  it("populates hazards with all 5 kinds, classified", () => {
    const props: FeatureProps = {
      building_uid: "b5",
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_depth_max: 3,
    };
    const view = buildPropertyCard(picked(props), manifest());
    expect(view.hazards).toHaveLength(5);
    const river = view.hazards.find((h) => h.key === "river_flood");
    expect(river?.kind).toBe("risk_depth");
    expect(view.hazards.find((h) => h.key === "tsunami")?.kind).toBe("no_data");
  });

  it("uses building_uid as title fallback when undefined", () => {
    const view = buildPropertyCard(picked({ building_uid: undefined as never }), manifest());
    expect(view.buildingUid).toBe("(unknown)");
  });
});
