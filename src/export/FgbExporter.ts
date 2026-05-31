import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";
import type { BBox } from "@/types/map";
import type { HazardKey } from "@/types/hazard";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { parseSourceIds } from "@/manifest/sourceIdParser";
import { featureIntersectsBbox } from "@/utils/bbox";

export interface FgbExportInput {
  bbox: BBox;
  selectedHazards: HazardKey[];
}

export interface GeoJsonExportResult {
  blob: Blob;
  filename: string;
  featureCount: number;
  sourceIds: string[];
  fgbFilesUsed: string[];
}

export class FgbExportError extends Error {}

export class FgbExporter {
  constructor(
    private readonly manifest: ManifestRegistry,
    private readonly fgbDirectoryUrl: string,
  ) {}

  async exportBbox(input: FgbExportInput): Promise<GeoJsonExportResult> {
    const fgbFiles = this.manifest.fgbFiles();
    if (fgbFiles.length === 0) {
      throw new FgbExportError("Manifest declares no FGB files for this city.");
    }

    const firstUrl = `${this.fgbDirectoryUrl}/${fgbFiles[0]}`;
    // Single Range preflight on the first file. If this host supports it,
    // we assume the rest do too (same origin, same _headers rule).
    await this.assertRangeSupport(firstUrl);

    const [minX, minY, maxX, maxY] = input.bbox;
    const features: GeoJSON.Feature[] = [];
    const seen = new Set<string>();
    const sourceIds = new Set<string>();
    const filesUsed: string[] = [];

    // Stream + bbox-filter every FGB file in parallel — each is an independent
    // network-bound range scan, so a city split across multiple files (Osaka,
    // Yokohama, …) no longer pays the sum of their fetch times serially.
    const perFile = await Promise.all(
      fgbFiles.map(async (file) => {
        const url = `${this.fgbDirectoryUrl}/${file}`;
        const iter = deserialize(url, {
          minX,
          minY,
          maxX,
          maxY,
        }) as AsyncIterable<GeoJSON.Feature>;
        const collected: GeoJSON.Feature[] = [];
        for await (const feature of iter) {
          if (!feature || !feature.properties) continue;
          if (!featureIntersectsBbox(feature, input.bbox)) continue;
          const uid = feature.properties["building_uid"];
          if (typeof uid !== "string") continue;
          collected.push(feature);
        }
        return { file, collected };
      }),
    );

    // Merge sequentially in declared file order so cross-file dedup stays
    // deterministic (first file that contains a building_uid wins).
    for (const { file, collected } of perFile) {
      let touched = false;
      for (const feature of collected) {
        const uid = feature.properties!["building_uid"] as string;
        if (seen.has(uid)) continue;
        seen.add(uid);
        collectSourceIds(feature.properties, input.selectedHazards, sourceIds);
        features.push(feature);
        touched = true;
      }
      if (touched) filesUsed.push(file);
    }

    const generatedAt = new Date().toISOString();
    const geojson = {
      type: "FeatureCollection" as const,
      metadata: {
        generated_at: generatedAt,
        city_code: this.manifest.cityCode,
        city_name: this.manifest.cityName,
        bbox: input.bbox,
        selected_hazards: input.selectedHazards,
        source_ids: [...sourceIds],
        fgb_files: filesUsed,
        attribution: this.manifest.attribution,
        disclaimer:
          "Static analysis of official PLATEAU hazard maps. Not a real-time forecast.",
      },
      features,
    };

    const blob = new Blob([JSON.stringify(geojson)], {
      type: "application/geo+json",
    });
    const stamp = generatedAt.replace(/[:.]/g, "-");
    return {
      blob,
      filename: `plateau-risk-lens-${this.manifest.cityCode}-${stamp}.geojson`,
      featureCount: features.length,
      sourceIds: [...sourceIds],
      fgbFilesUsed: filesUsed,
    };
  }

  /**
   * Issue a small Range GET and require 206 Partial Content. HEAD is
   * unreliable: some hosts return 200 even when they'd serve ranges, and
   * some return Accept-Ranges only on real range requests.
   */
  private async assertRangeSupport(url: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Range: "bytes=0-15" } });
    } catch (err) {
      throw new FgbExportError(`Failed to reach FGB artifact at ${url}: ${String(err)}`);
    }
    if (res.status !== 206) {
      throw new FgbExportError(
        `FGB host does not support byte-range requests on ${url}. ` +
          `Expected HTTP 206, got ${res.status}. ` +
          `Configure the artifact origin with Accept-Ranges: bytes and CORS.`,
      );
    }
    // Drain the body so the connection can be reused.
    try {
      await res.arrayBuffer();
    } catch {
      /* ignore */
    }
  }
}

function collectSourceIds(
  props: GeoJSON.GeoJsonProperties,
  hazards: HazardKey[],
  into: Set<string>,
): void {
  if (!props) return;
  for (const key of hazards) {
    for (const suffix of ["coverage_source_ids", "hit_source_ids"]) {
      for (const id of parseSourceIds(props[`${key}_${suffix}`])) into.add(id);
    }
  }
}
