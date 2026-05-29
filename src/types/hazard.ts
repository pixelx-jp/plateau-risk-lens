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
  coverageConfidence: CoverageConfidence | null;
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
