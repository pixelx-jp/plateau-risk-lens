import type maplibregl from "maplibre-gl";
import { HAZARD_KEYS, type HazardKey } from "@/types/hazard";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { classifyHazard, extractHazardField } from "@/hazard/hazardClassification";
import type { FeatureProps } from "@/types/feature";

export interface CityCoverageSnapshot {
  buildingsTotal: number;
  fields: Record<string, number>; // ratio 0–1
  hazards: Record<HazardKey, { coveredRatio: number; coveredCount: number; total: number }>;
}

export interface ViewportCoverageSnapshot {
  buildings: number;
  yearKnown: number;
  structureKnown: number;
  perHazard: Record<HazardKey, { covered: number; noData: number; lowConfidence: number }>;
}

export class CoverageMeter {
  constructor(
    private readonly map: maplibregl.Map,
    private readonly manifest: ManifestRegistry,
  ) {}

  getCityCoverage(): CityCoverageSnapshot {
    const total = this.manifest.nBuildings;
    const fields: Record<string, number> = {};
    for (const [k, v] of Object.entries(
      this.manifest.manifest.field_coverage ?? {},
    )) {
      if (typeof v === "number") fields[k] = v;
    }
    const hazards: CityCoverageSnapshot["hazards"] = {} as never;
    for (const key of HAZARD_KEYS) {
      const stats = this.manifest.getHazardStats(key);
      const coveredCount = stats?.covered_count ?? 0;
      hazards[key] = {
        coveredCount,
        total,
        coveredRatio: total > 0 ? coveredCount / total : 0,
      };
    }
    return { buildingsTotal: total, fields, hazards };
  }

  getViewportCoverage(layerIds: string[]): ViewportCoverageSnapshot {
    const perHazard: ViewportCoverageSnapshot["perHazard"] = {} as never;
    for (const key of HAZARD_KEYS) {
      perHazard[key] = { covered: 0, noData: 0, lowConfidence: 0 };
    }

    if (layerIds.length === 0) {
      return { buildings: 0, yearKnown: 0, structureKnown: 0, perHazard };
    }

    const features = this.map.queryRenderedFeatures({ layers: layerIds });
    const seen = new Map<string, FeatureProps>();
    for (const f of features) {
      const props = f.properties as FeatureProps | null;
      if (!props) continue;
      const uid = props.building_uid;
      if (typeof uid !== "string") continue;
      if (seen.has(uid)) continue;
      seen.set(uid, props);
    }

    let yearKnown = 0;
    let structureKnown = 0;
    for (const props of seen.values()) {
      if (typeof props.year_built === "number" && props.year_built > 0) {
        yearKnown += 1;
      }
      if (typeof props.structure === "string" && props.structure.length > 0) {
        structureKnown += 1;
      }
      // Bucket using the same classifier that drives the map, so the badge
      // always matches what the user sees painted. (Earlier we duplicated
      // the bucketing logic here and it drifted: missing confidence was
      // counted as "covered" while the map painted it as low_confidence.)
      for (const key of HAZARD_KEYS) {
        const field = extractHazardField(props, key);
        const kind = classifyHazard(field);
        if (kind === "no_data") perHazard[key].noData += 1;
        else if (kind === "low_confidence") perHazard[key].lowConfidence += 1;
        else perHazard[key].covered += 1;
      }
    }

    return {
      buildings: seen.size,
      yearKnown,
      structureKnown,
      perHazard,
    };
  }
}
