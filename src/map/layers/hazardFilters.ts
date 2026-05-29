import type { ExpressionSpecification } from "maplibre-gl";
import { HAZARD_USES_IN_ZONE, type HazardKey } from "@/types/hazard";

// MVT typing for booleans is unreliable across encoders; we match all
// common falsy/truthy encodings explicitly.
function eqAny(field: string, values: ReadonlyArray<string | number | boolean>): ExpressionSpecification {
  return [
    "any",
    ...values.map(
      (v) => ["==", ["get", field], v] as ExpressionSpecification,
    ),
  ];
}

const FALSEY = [false, 0, "0", "false"] as const;
const TRUTHY = [true, 1, "1", "true"] as const;

// Trusted confidence allowlist — must match TRUSTED_CONFIDENCE in
// hazardClassification.ts. Keeping them in sync is enforced by tests.
const TRUSTED_CONFIDENCES = [
  "explicit_polygon",
  "declared_full_admin",
  "inundation_bounded",
] as const;

/**
 * Buildings that are explicitly *not* covered, OR whose `_covered` field is
 * missing entirely. Missing data must render as no_data hatch, never as a
 * gap in the map.
 */
export function coveredFalseFilter(key: HazardKey): ExpressionSpecification {
  return [
    "any",
    ["!", ["has", `${key}_covered`]],
    eqAny(`${key}_covered`, FALSEY),
  ];
}

export function coveredTrueFilter(key: HazardKey): ExpressionSpecification {
  return eqAny(`${key}_covered`, TRUTHY);
}

/**
 * "Known" = covered=true AND confidence is in the trusted allowlist. Any
 * other value (null, missing, "unknown", or a pipeline typo) falls into
 * the low-confidence bucket.
 */
export function knownConfidenceFilter(key: HazardKey): ExpressionSpecification {
  return [
    "all",
    coveredTrueFilter(key),
    ["has", `${key}_coverage_confidence`],
    [
      "any",
      ...TRUSTED_CONFIDENCES.map(
        (v) =>
          ["==", ["get", `${key}_coverage_confidence`], v] as ExpressionSpecification,
      ),
    ],
  ];
}

/** Low-confidence = covered=true AND confidence not trusted (incl. null/missing/typo). */
export function unknownConfidenceFilter(key: HazardKey): ExpressionSpecification {
  return [
    "all",
    coveredTrueFilter(key),
    [
      "any",
      ["!", ["has", `${key}_coverage_confidence`]],
      [
        "all",
        ...TRUSTED_CONFIDENCES.map(
          (v) =>
            ["!=", ["get", `${key}_coverage_confidence`], v] as ExpressionSpecification,
        ),
      ],
    ],
  ];
}

/**
 * For landslide (in_zone) hazards, "known and not in the danger zone" means
 * in_zone is explicitly false. null/missing must NOT render safe.
 */
export function inZoneExplicitlyFalseFilter(key: HazardKey): ExpressionSpecification {
  if (!HAZARD_USES_IN_ZONE[key]) {
    throw new Error(`inZoneExplicitlyFalseFilter called on non-in_zone hazard ${key}`);
  }
  return [
    "all",
    ["has", `${key}_in_zone`],
    eqAny(`${key}_in_zone`, FALSEY),
  ];
}

export function inZoneTrueFilter(key: HazardKey): ExpressionSpecification {
  return eqAny(`${key}_in_zone`, TRUTHY);
}
