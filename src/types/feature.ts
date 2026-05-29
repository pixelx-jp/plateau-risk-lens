import type { CoverageConfidence } from "./hazard";

export type BuildingUid = string;
export type SourceId = string;

export interface FeatureProps {
  building_uid: BuildingUid;
  city_code?: string | null;
  ward_code?: string | null;

  year_built?: number | null;
  structure?: string | null;
  usage?: string | null;
  floors?: number | null;
  floors_above?: number | null;
  floors_below?: number | null;
  height?: number | null;
  fireproof_type?: string | null;
  fire_resistance?: string | null;

  river_flood_covered?: boolean | number | string | null;
  river_flood_coverage_source_ids?: string | null;
  river_flood_depth_max?: number | null;
  river_flood_hit_source_ids?: string | null;
  river_flood_coverage_confidence?: CoverageConfidence | null;

  inland_flood_covered?: boolean | number | string | null;
  inland_flood_coverage_source_ids?: string | null;
  inland_flood_depth_max?: number | null;
  inland_flood_hit_source_ids?: string | null;
  inland_flood_coverage_confidence?: CoverageConfidence | null;

  tsunami_covered?: boolean | number | string | null;
  tsunami_coverage_source_ids?: string | null;
  tsunami_depth_max?: number | null;
  tsunami_hit_source_ids?: string | null;
  tsunami_coverage_confidence?: CoverageConfidence | null;

  storm_surge_covered?: boolean | number | string | null;
  storm_surge_coverage_source_ids?: string | null;
  storm_surge_depth_max?: number | null;
  storm_surge_hit_source_ids?: string | null;
  storm_surge_coverage_confidence?: CoverageConfidence | null;

  landslide_covered?: boolean | number | string | null;
  landslide_coverage_source_ids?: string | null;
  landslide_in_zone?: boolean | number | string | null;
  landslide_hit_source_ids?: string | null;
  landslide_coverage_confidence?: CoverageConfidence | null;
}
