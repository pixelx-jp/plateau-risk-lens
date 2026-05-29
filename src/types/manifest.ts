import type { HazardKey, CoverageConfidence } from "./hazard";
import type { SourceId } from "./feature";

export interface ManifestEntry {
  source_id: SourceId;
  dataset_id: string;
  hazard_key?: HazardKey;
  title?: { ja?: string; en?: string };
  year?: number;
  published_at?: string;
  url?: string;
  license?: string;
  publisher?: string;
  coverage_confidence?: CoverageConfidence;
}

export interface CityCoverageHazard {
  covered_count: number;
  hit_count: number;
  coverage_confidence_breakdown?: Record<string, number>;
}

export interface CityCoverage {
  city_code: string;
  city_name?: string | { ja?: string; en?: string };
  n_buildings: number;
  field_coverage: Record<string, number>;
  coverage_stats: Record<HazardKey, CityCoverageHazard>;
}

export interface PipelineManifest {
  attribution: string;
  tool: string;
  tool_version: string;
  generated_at: string;
  city_code: string;
  city_name: string;
  dataset_year: number;
  n_buildings: number;
  datasets: string[];
  sources: Record<SourceId, {
    source_id: SourceId;
    dataset_id: string;
    year: number;
    url?: string | null;
    coverage_extent_url?: string | null;
  }>;
  coverage_stats: Array<{
    kind: HazardKey;
    covered_count: number;
    hit_count: number;
    coverage_confidence_breakdown?: Record<string, number>;
  }>;
  field_coverage: Record<string, number>;
  notes?: string[];
  /**
   * Optional FGB artifact list, relative to the manifest URL's `buildings/`
   * directory. Required for multi-ward cities (Osaka, Yokohama, Fukuoka,
   * Nagoya) since they emit per-ward `.fgb` files instead of one per city.
   *
   * If absent, the exporter falls back to a single `{city_code}.fgb` probe,
   * which is correct for all Tokyo 23 wards.
   */
  artifacts?: {
    fgb_files?: string[];
  };
}
