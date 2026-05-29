import { describe, expect, it } from "vitest";
import { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { PipelineManifest } from "@/types/manifest";

function build(): PipelineManifest {
  return {
    attribution: "© Project PLATEAU / MLIT (CC BY 4.0)",
    tool: "plateau-bridge",
    tool_version: "0.1.0",
    generated_at: "2026-05-26T07:22:13Z",
    city_code: "13113",
    city_name: "Shibuya-ku",
    dataset_year: 2023,
    n_buildings: 41829,
    datasets: ["plateau-13113-shibuya-ku-2023-fld"],
    sources: {
      "plateau-13113-shibuya-ku-2023-fld": {
        source_id: "plateau-13113-shibuya-ku-2023-fld",
        dataset_id: "plateau-13113-shibuya-ku-2023-fld",
        year: 2023,
        url: "https://example.jp/source",
      },
      "plateau-13113-shibuya-ku-2023-lsld": {
        source_id: "plateau-13113-shibuya-ku-2023-lsld",
        dataset_id: "plateau-13113-shibuya-ku-2023-lsld",
        year: 2023,
      },
    },
    coverage_stats: [
      { kind: "river_flood", covered_count: 28921, hit_count: 28921 },
    ],
    field_coverage: {},
  };
}

describe("ManifestRegistry source lookup", () => {
  it("returns null for unknown source_id", () => {
    const r = new ManifestRegistry(build());
    expect(r.getSource("does-not-exist")).toBeNull();
  });

  it("returns an entry with url passthrough", () => {
    const r = new ManifestRegistry(build());
    const entry = r.getSource("plateau-13113-shibuya-ku-2023-fld");
    expect(entry?.url).toBe("https://example.jp/source");
    expect(entry?.dataset_id).toBe("plateau-13113-shibuya-ku-2023-fld");
  });

  it("getSources resolves known ids and silently drops unknown", () => {
    const r = new ManifestRegistry(build());
    const entries = r.getSources([
      "plateau-13113-shibuya-ku-2023-fld",
      "made-up",
      "plateau-13113-shibuya-ku-2023-lsld",
    ]);
    expect(entries.map((e) => e.source_id)).toEqual([
      "plateau-13113-shibuya-ku-2023-fld",
      "plateau-13113-shibuya-ku-2023-lsld",
    ]);
  });

  it("datasetCaption falls back through manifest title → suffix table → dataset_id", () => {
    const r = new ManifestRegistry(build());
    const entry = r.getSource("plateau-13113-shibuya-ku-2023-fld")!;
    // Manifest has no title, suffix table catches it.
    expect(r.datasetCaption(entry, "en")).toBe(
      "Flood inundation assumption map (2023)",
    );
    expect(r.datasetCaption(entry, "ja")).toBe(
      "洪水浸水想定区域図 (2023)",
    );
  });

  it("getHazardStats returns null for hazards not in coverage_stats", () => {
    const r = new ManifestRegistry(build());
    expect(r.getHazardStats("river_flood")?.covered_count).toBe(28921);
    expect(r.getHazardStats("tsunami")).toBeNull();
  });
});
