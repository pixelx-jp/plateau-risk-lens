export type HazardKey =
  | "river_flood"
  | "inland_flood"
  | "tsunami"
  | "storm_surge"
  | "landslide";

export const HAZARD_KEYS: readonly HazardKey[] = [
  "river_flood",
  "inland_flood",
  "tsunami",
  "storm_surge",
  "landslide",
] as const;

export type CoverageConfidence =
  | "explicit_polygon"
  | "declared_full_admin"
  | "inundation_bounded"
  | "unknown";

export type HazardStatusKind =
  | "no_data"
  | "low_confidence"
  | "safe"
  | "risk_depth"
  | "risk_zone";

export interface HazardField {
  key: HazardKey;
  covered: boolean;
  coverageSourceIds: string[];
  /**
   * `undefined` here is load-bearing and distinct from `null`:
   *
   *   - `undefined` → the property was not present on the source feature.
   *     This happens systematically when reading from PMTiles, because
   *     plateau-core's tippecanoe encoder strips `*_coverage_confidence` to
   *     keep MVT tile size down (see DEFAULT_PMTILES_PROPERTIES in
   *     plateau-core/.../ops/pmtiles.py). When the property is absent we
   *     trust the `covered` verdict — the pipeline computed it from the same
   *     polygons that produced the confidence value.
   *
   *   - `null` → the property was present but explicitly null. This is what
   *     the pipeline writes when it could not determine the verdict (e.g.
   *     building outside any survey extent), and means low confidence.
   *
   *   - string value → check against the trusted allowlist.
   *
   * FGB exports keep the full confidence string, so this distinction is
   * only meaningful for PMTiles-derived features.
   */
  coverageConfidence: CoverageConfidence | null | undefined;
  depthMax: number | null;
  inZone: boolean | null;
  hitSourceIds: string[];
}

export interface HazardStatus {
  key: HazardKey;
  kind: HazardStatusKind;
  depthMax: number | null;
  inZone: boolean | null;
  coverageSourceIds: string[];
  hitSourceIds: string[];
}

export const HAZARD_USES_IN_ZONE: Record<HazardKey, boolean> = {
  river_flood: false,
  inland_flood: false,
  tsunami: false,
  storm_surge: false,
  landslide: true,
};
