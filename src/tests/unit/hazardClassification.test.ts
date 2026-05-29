import { describe, expect, it } from "vitest";
import { classifyHazard, extractHazardField, toHazardStatus } from "@/hazard/hazardClassification";
import type { FeatureProps } from "@/types/feature";

const empty: FeatureProps = { building_uid: "x" };

describe("classifyHazard — honesty invariants", () => {
  it("covered=false is always no_data, never safe", () => {
    const f = { ...empty, river_flood_covered: false };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("no_data");
  });

  it("covered=false with depth_max=null is still no_data", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: false,
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("no_data");
  });

  it("covered=true && depth_max=null is safe", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("safe");
  });

  it("coverage_confidence=unknown is low_confidence, not safe", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "unknown",
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("low_confidence");
  });

  it("covered=true && depth_max>0 is risk_depth", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_depth_max: 2.5,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("risk_depth");
  });

  it("landslide uses in_zone path", () => {
    const f: FeatureProps = {
      ...empty,
      landslide_covered: true,
      landslide_coverage_confidence: "explicit_polygon",
      landslide_in_zone: true,
    };
    expect(classifyHazard(extractHazardField(f, "landslide"))).toBe("risk_zone");

    const safe = { ...f, landslide_in_zone: false };
    expect(classifyHazard(extractHazardField(safe, "landslide"))).toBe("safe");
  });

  it("landslide in_zone=null is low_confidence, not safe", () => {
    const f: FeatureProps = {
      ...empty,
      landslide_covered: true,
      landslide_coverage_confidence: "explicit_polygon",
      // in_zone intentionally omitted
    };
    expect(classifyHazard(extractHazardField(f, "landslide"))).toBe("low_confidence");
  });

  it("rejects unknown confidence values (typos) as low_confidence", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      // Hypothetical pipeline typo or new enum value.
      river_flood_coverage_confidence: "explicit_poly" as unknown as never,
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("low_confidence");
  });

  it("MVT bool encodings normalize: 0/1/'true'/'false'", () => {
    for (const v of [0, "0", "false", false] as const) {
      const f = { ...empty, river_flood_covered: v };
      expect(extractHazardField(f, "river_flood").covered).toBe(false);
    }
    for (const v of [1, "1", "true", true] as const) {
      const f = { ...empty, river_flood_covered: v };
      expect(extractHazardField(f, "river_flood").covered).toBe(true);
    }
  });

  it("depth_max=0 is safe (covered, not in inundation)", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_depth_max: 0,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("safe");
  });

  it("coverage_confidence explicitly null is low_confidence, not safe", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: null,
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("low_confidence");
  });

  it("coverage_confidence MISSING (PMTiles-stripped) trusts the covered verdict", () => {
    // tippecanoe omits *_coverage_confidence to keep MVT tile size down. When
    // the property key is absent (not just null), we trust covered=true and
    // render the depth band. See HazardField.coverageConfidence doc.
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      // river_flood_coverage_confidence intentionally absent
      river_flood_depth_max: 1.5,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("risk_depth");
  });

  it("missing confidence + missing depth still resolves to safe (not low)", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      // both confidence and depth_max stripped by PMTiles
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("safe");
  });

  it("inundation_bounded is treated as known (not low_confidence)", () => {
    // Real plateau-core data uses this value even though the plan only
    // documents three enums; it means "coverage inferred via inundation
    // polygon", which IS trustworthy enough to render safe/depth.
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "inundation_bounded",
      river_flood_depth_max: null,
    };
    expect(classifyHazard(extractHazardField(f, "river_flood"))).toBe("safe");
  });

  it("toHazardStatus preserves source ids", () => {
    const f: FeatureProps = {
      ...empty,
      river_flood_covered: true,
      river_flood_coverage_confidence: "explicit_polygon",
      river_flood_coverage_source_ids: "src1,src2",
      river_flood_hit_source_ids: "src1",
      river_flood_depth_max: 1.2,
    };
    const status = toHazardStatus(f, "river_flood");
    expect(status.coverageSourceIds).toEqual(["src1", "src2"]);
    expect(status.hitSourceIds).toEqual(["src1"]);
    expect(status.kind).toBe("risk_depth");
  });
});
