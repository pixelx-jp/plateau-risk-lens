import type { FeatureProps } from "@/types/feature";
import {
  HAZARD_USES_IN_ZONE,
  type CoverageConfidence,
  type HazardField,
  type HazardKey,
  type HazardStatus,
  type HazardStatusKind,
} from "@/types/hazard";
import { parseSourceIds } from "@/manifest/sourceIdParser";
import { normalizeBool } from "@/utils/bool";

// Per plan: coverage_confidence is enum? (nullable). To avoid rendering a
// building as safe green when we shouldn't, use an *allowlist* of trusted
// values rather than a blocklist of bad ones — that way any future enum
// value, a typo from the pipeline, or `null` defaults to low-confidence.
//
// Trusted values:
//   - explicit_polygon       (plan-documented)
//   - declared_full_admin    (plan-documented)
//   - inundation_bounded     (emitted by the current plateau-core pipeline;
//                             means "coverage was inferred from an inundation
//                             polygon" — direct evidence of coverage)
const TRUSTED_CONFIDENCE: ReadonlySet<CoverageConfidence> = new Set([
  "explicit_polygon",
  "declared_full_admin",
  "inundation_bounded",
]);

export function isTrustedConfidence(
  value: CoverageConfidence | null | undefined,
): boolean {
  // undefined = property not present on the feature (PMTiles strips it via
  // tippecanoe's -y allowlist; see HazardField doc). Trust the covered verdict.
  if (value === undefined) return true;
  if (value === null) return false;
  return TRUSTED_CONFIDENCE.has(value);
}

function isLowConfidence(value: CoverageConfidence | null | undefined): boolean {
  return !isTrustedConfidence(value);
}

export function extractHazardField(
  props: FeatureProps,
  key: HazardKey,
): HazardField {
  const covered = normalizeBool(props[`${key}_covered` as keyof FeatureProps]) ?? false;
  const coverageSourceIds = parseSourceIds(
    props[`${key}_coverage_source_ids` as keyof FeatureProps],
  );
  const hitSourceIds = parseSourceIds(
    props[`${key}_hit_source_ids` as keyof FeatureProps],
  );
  // Preserve undefined-vs-null distinction; isTrustedConfidence relies on it.
  const rawConfidence =
    props[`${key}_coverage_confidence` as keyof FeatureProps];
  const coverageConfidence =
    rawConfidence === undefined
      ? undefined
      : (rawConfidence as CoverageConfidence | null);

  let depthMax: number | null = null;
  let inZone: boolean | null = null;
  if (HAZARD_USES_IN_ZONE[key]) {
    inZone = normalizeBool(props[`${key}_in_zone` as keyof FeatureProps]);
  } else {
    const raw = props[`${key}_depth_max` as keyof FeatureProps];
    if (typeof raw === "number" && Number.isFinite(raw)) depthMax = raw;
  }

  return {
    key,
    covered,
    coverageSourceIds,
    coverageConfidence,
    depthMax,
    inZone,
    hitSourceIds,
  };
}

export function classifyHazard(field: HazardField): HazardStatusKind {
  if (!field.covered) return "no_data";
  if (isLowConfidence(field.coverageConfidence)) return "low_confidence";
  if (HAZARD_USES_IN_ZONE[field.key]) {
    // null/missing in_zone for a covered building means the pipeline didn't
    // record the verdict — treat as low confidence rather than safe.
    if (field.inZone === true) return "risk_zone";
    if (field.inZone === false) return "safe";
    return "low_confidence";
  }
  // depth_max=null and depth_max<=0 both mean "covered but not in any
  // inundation polygon" → safe. Only strictly positive depth is a risk.
  if (field.depthMax !== null && field.depthMax > 0) return "risk_depth";
  return "safe";
}

export function toHazardStatus(props: FeatureProps, key: HazardKey): HazardStatus {
  const field = extractHazardField(props, key);
  return {
    key,
    kind: classifyHazard(field),
    depthMax: field.depthMax,
    inZone: field.inZone,
    coverageSourceIds: field.coverageSourceIds,
    hitSourceIds: field.hitSourceIds,
  };
}
