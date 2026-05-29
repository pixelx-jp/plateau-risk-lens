import type { ExpressionSpecification } from "maplibre-gl";
import { HAZARD_USES_IN_ZONE, type HazardKey } from "@/types/hazard";
import { HAZARD_VISUAL } from "@/hazard/hazardConfig";

/**
 * Depth → color expression matching the plan exactly:
 *
 *     ["case",
 *       ["!", ["has", `${key}_depth_max`]], safe,
 *       ["==", ["get", `${key}_depth_max`], null], safe,
 *       ["<=", ["get", `${key}_depth_max`], 0], safe,
 *       ["<", ["get", `${key}_depth_max`], 0.5], band1,
 *       ...
 *       fallback]
 *
 * The three leading `safe` cases collapse "missing field", "null depth",
 * and "zero depth" into the same green — without them, a depth=0 building
 * (covered, not in inundation) would render yellow.
 *
 * In-zone hazards (landslide) use `inZoneFilter` at the layer level and a
 * static color; this function returns a constant zone color for them.
 */
export function depthColorExpression(key: HazardKey): ExpressionSpecification {
  const visual = HAZARD_VISUAL[key];
  if (HAZARD_USES_IN_ZONE[key]) {
    return ["literal", visual.zoneColor] as unknown as ExpressionSpecification;
  }

  const field = `${key}_depth_max`;
  const cases: (ExpressionSpecification | number | string)[] = [];

  cases.push(["!", ["has", field]] as ExpressionSpecification);
  cases.push(visual.safeColor);
  cases.push(["==", ["get", field], null]);
  cases.push(visual.safeColor);
  cases.push(["<=", ["get", field], 0]);
  cases.push(visual.safeColor);

  for (const band of visual.depthBands) {
    if (!Number.isFinite(band.ltMeters)) continue;
    cases.push(["<", ["get", field], band.ltMeters]);
    cases.push(band.color);
  }

  const fallback =
    visual.depthBands[visual.depthBands.length - 1]?.color ?? visual.zoneColor;

  return ["case", ...cases, fallback] as ExpressionSpecification;
}

export function inZoneFilter(key: HazardKey, inZone: boolean): ExpressionSpecification {
  const truthy = [true, 1, "1", "true"] as const;
  const falsy = [false, 0, "0", "false"] as const;
  const values = inZone ? truthy : falsy;
  return [
    "any",
    ...values.map((v) => ["==", ["get", `${key}_in_zone`], v] as ExpressionSpecification),
  ];
}
