import type { HazardKey } from "@/types/hazard";
import type { PipelineManifest, ManifestEntry } from "@/types/manifest";
import type { SourceId } from "@/types/feature";
import type { Locale } from "@/i18n/types";
import { captionForSource } from "@/i18n/captions/sourceCaptions";
import { validateManifest } from "./manifestSchema";

export class ManifestRegistry {
  private readonly entries = new Map<SourceId, ManifestEntry>();

  constructor(public readonly manifest: PipelineManifest) {
    for (const [id, src] of Object.entries(manifest.sources)) {
      this.entries.set(id, {
        source_id: src.source_id,
        dataset_id: src.dataset_id,
        year: src.year,
        url: src.url ?? undefined,
        publisher: "MLIT",
        license: manifest.attribution,
      });
    }
  }

  static async load(url: string): Promise<ManifestRegistry> {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) {
      throw new Error(`Failed to load manifest at ${url}: ${response.status}`);
    }
    const json: unknown = await response.json();
    return new ManifestRegistry(validateManifest(json));
  }

  getSource(id: SourceId): ManifestEntry | null {
    return this.entries.get(id) ?? null;
  }

  getSources(ids: SourceId[]): ManifestEntry[] {
    const out: ManifestEntry[] = [];
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry) out.push(entry);
    }
    return out;
  }

  getHazardStats(key: HazardKey) {
    return (
      this.manifest.coverage_stats.find((s) => s.kind === key) ?? null
    );
  }

  getFieldCoverage(field: string): number | null {
    const v = this.manifest.field_coverage[field];
    return typeof v === "number" ? v : null;
  }

  datasetCaption(entry: ManifestEntry, locale: Locale): string {
    // Per plan: title → local fallback → dataset_id.
    const captioned = captionForSource(entry, locale);
    if (captioned) return captioned;
    return entry.dataset_id;
  }

  get cityCode(): string {
    return this.manifest.city_code;
  }

  get cityName(): string {
    return this.manifest.city_name;
  }

  get attribution(): string {
    return this.manifest.attribution;
  }

  get datasetYear(): number {
    return this.manifest.dataset_year;
  }

  get generatedAt(): string {
    return this.manifest.generated_at;
  }

  get nBuildings(): number {
    return this.manifest.n_buildings;
  }

  /**
   * FGB files relative to the `buildings/` directory. Returns the manifest's
   * `artifacts.fgb_files` list if present; otherwise falls back to a single
   * `{city_code}.fgb`, which is correct for all Tokyo 23 wards but missing
   * for multi-ward cities (Osaka, Yokohama, Fukuoka, Nagoya).
   */
  fgbFiles(): string[] {
    const explicit = this.manifest.artifacts?.fgb_files;
    if (explicit && explicit.length > 0) return explicit;
    return [`${this.manifest.city_code}.fgb`];
  }
}
