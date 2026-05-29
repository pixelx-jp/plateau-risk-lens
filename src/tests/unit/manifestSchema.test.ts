import { describe, expect, it } from "vitest";
import { ManifestValidationError, validateManifest } from "@/manifest/manifestSchema";

function valid(): unknown {
  return {
    attribution: "© Project PLATEAU / MLIT (CC BY 4.0)",
    tool: "plateau-bridge",
    tool_version: "0.1.0",
    generated_at: "2026-05-26T07:22:13Z",
    city_code: "13113",
    city_name: "Shibuya-ku",
    dataset_year: 2023,
    n_buildings: 41829,
    datasets: ["plateau-13113-shibuya-ku-2023-bldg"],
    sources: {
      "plateau-13113-shibuya-ku-2023-fld": {
        source_id: "plateau-13113-shibuya-ku-2023-fld",
        dataset_id: "plateau-13113-shibuya-ku-2023-fld",
        year: 2023,
      },
    },
    coverage_stats: [
      { kind: "river_flood", covered_count: 28921, hit_count: 28921 },
    ],
    field_coverage: { year_built: 0.5, structure: 1.0 },
  };
}

describe("validateManifest", () => {
  it("accepts a real plateau-core manifest shape", () => {
    expect(() => validateManifest(valid())).not.toThrow();
  });

  it("rejects non-object input with a path of $", () => {
    expect(() => validateManifest(null)).toThrow(/^manifest\.json: \$/);
    expect(() => validateManifest("nope")).toThrow(/expected object/);
  });

  it("rejects missing top-level scalars", () => {
    const m = valid() as Record<string, unknown>;
    delete m.attribution;
    expect(() => validateManifest(m)).toThrow(/\$\.attribution.*expected string/);
  });

  it("rejects wrong types on n_buildings", () => {
    const m = valid() as Record<string, unknown>;
    m.n_buildings = "lots";
    expect(() => validateManifest(m)).toThrow(/n_buildings.*expected number/);
  });

  it("rejects unknown hazard kind in coverage_stats", () => {
    const m = valid() as Record<string, unknown>;
    m.coverage_stats = [{ kind: "meteor_strike", covered_count: 0, hit_count: 0 }];
    expect(() => validateManifest(m)).toThrow(/unknown hazard kind "meteor_strike"/);
  });

  it("rejects field_coverage values outside [0, 1]", () => {
    const m = valid() as Record<string, unknown>;
    m.field_coverage = { year_built: 1.5 };
    expect(() => validateManifest(m)).toThrow(/field_coverage\.year_built/);
  });

  it("rejects sources entry missing source_id", () => {
    const m = valid() as Record<string, unknown>;
    m.sources = { x: { dataset_id: "x", year: 2023 } };
    expect(() => validateManifest(m)).toThrow(/sources\["x"\]\.source_id/);
  });

  it("throws ManifestValidationError specifically", () => {
    try {
      validateManifest({ attribution: 123 });
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      return;
    }
    throw new Error("expected to throw");
  });
});
