import type maplibregl from "maplibre-gl";
import type { FeatureProps } from "@/types/feature";
import { HAZARD_KEYS } from "@/types/hazard";
import { toHazardStatus } from "@/hazard/hazardClassification";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { ManifestEntry } from "@/types/manifest";
import type { HazardStatus } from "@/types/hazard";

export interface PickedFeature {
  props: FeatureProps;
  hazards: HazardStatus[];
}

export interface PropertyCardViewModel {
  buildingUid: string;
  props: FeatureProps;
  hazards: HazardStatus[];
  coverageSources: ManifestEntry[];
  hitSources: ManifestEntry[];
}

export class FeaturePicker {
  constructor(
    private readonly map: maplibregl.Map,
    private readonly manifest: ManifestRegistry,
  ) {}

  pickAtPoint(point: maplibregl.PointLike, layerIds: string[]): PickedFeature | null {
    if (layerIds.length === 0) return null;
    const features = this.map.queryRenderedFeatures(point, { layers: layerIds });
    const first = features[0];
    if (!first || !first.properties) return null;
    const props = first.properties as FeatureProps;
    return {
      props,
      hazards: HAZARD_KEYS.map((k) => toHazardStatus(props, k)),
    };
  }

  buildPropertyCard(picked: PickedFeature): PropertyCardViewModel {
    return buildPropertyCard(picked, this.manifest);
  }
}

export function buildPropertyCard(
  picked: PickedFeature,
  manifest: ManifestRegistry,
): PropertyCardViewModel {
  const coverageIds = new Set<string>();
  const hitIds = new Set<string>();
  for (const h of picked.hazards) {
    for (const id of h.coverageSourceIds) coverageIds.add(id);
    for (const id of h.hitSourceIds) hitIds.add(id);
  }
  return {
    buildingUid: picked.props.building_uid ?? "(unknown)",
    props: picked.props,
    hazards: picked.hazards,
    coverageSources: manifest.getSources([...coverageIds]),
    hitSources: manifest.getSources([...hitIds]),
  };
}
