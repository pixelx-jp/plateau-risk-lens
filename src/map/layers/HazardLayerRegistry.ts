import type maplibregl from "maplibre-gl";
import { HAZARD_USES_IN_ZONE, type HazardKey } from "@/types/hazard";
import {
  HAZARD_VISUAL,
  LOW_CONFIDENCE_COLOR,
  NO_DATA_COLOR,
} from "@/hazard/hazardConfig";
import {
  coveredFalseFilter,
  inZoneExplicitlyFalseFilter,
  inZoneTrueFilter,
  knownConfidenceFilter,
  unknownConfidenceFilter,
} from "./hazardFilters";
import { depthColorExpression } from "./hazardPaint";
import { NO_DATA_PATTERN_ID, registerNoDataPattern } from "./spritePatterns";

const SOURCE_ID = "buildings";
const SOURCE_LAYER = "buildings";

const BASE_OUTLINE_ID = "buildings-outline";
const WOODEN_LAYER_ID = "buildings-wooden-pre1981";
// Invisible fill covering every building, used for queryRenderedFeatures
// so clicks + viewport coverage work even when no hazard layer is active.
const INTERACTION_LAYER_ID = "buildings-interaction";

function layerIds(key: HazardKey) {
  return {
    noDataFill: `hazard-${key}-nodata-fill`,
    noDataHatch: `hazard-${key}-nodata-hatch`,
    lowConfidence: `hazard-${key}-lowconf-fill`,
    // In_zone hazards only: trusted coverage but missing in_zone field falls
    // here so it never paints as safe green.
    lowConfidenceInZoneMissing: `hazard-${key}-lowconf-fill-inzone-missing`,
    knownFill: `hazard-${key}-known-fill`,
    // In_zone hazards only: sibling fill painting safe when in_zone=false.
    knownSafe: `hazard-${key}-known-fill-safe`,
    knownOutline: `hazard-${key}-known-outline`,
  };
}

export class HazardLayerRegistry {
  private active: HazardKey[] = [];
  private opacity = 0.7;
  private wooden = false;
  private styleReady = false;

  constructor(private readonly map: maplibregl.Map) {}

  /** Must be called once the map style has loaded. */
  installBaseLayers(): void {
    registerNoDataPattern(this.map);
    if (!this.map.getSource(SOURCE_ID)) {
      // Source is added by MapStage; we only add layers here.
      return;
    }
    if (!this.map.getLayer(INTERACTION_LAYER_ID)) {
      // Transparent fill so clicks always hit a building, regardless of which
      // hazard fills are stacked above. It's also the canonical "what
      // buildings are in the viewport" source for CoverageMeter.
      this.map.addLayer({
        id: INTERACTION_LAYER_ID,
        source: SOURCE_ID,
        "source-layer": SOURCE_LAYER,
        type: "fill",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0,
        },
      });
    }
    if (!this.map.getLayer(BASE_OUTLINE_ID)) {
      this.map.addLayer({
        id: BASE_OUTLINE_ID,
        source: SOURCE_ID,
        "source-layer": SOURCE_LAYER,
        type: "line",
        paint: {
          "line-color": "#212121",
          "line-opacity": 0.25,
          "line-width": 0.4,
        },
      });
    }
    if (!this.map.getLayer(WOODEN_LAYER_ID)) {
      this.map.addLayer({
        id: WOODEN_LAYER_ID,
        source: SOURCE_ID,
        "source-layer": SOURCE_LAYER,
        type: "line",
        layout: { visibility: this.wooden ? "visible" : "none" },
        filter: [
          "all",
          [
            "any",
            ["==", ["get", "structure"], "wood"],
            ["==", ["get", "structure"], "wooden"],
            ["==", ["get", "structure"], "木造"],
            ["==", ["get", "structure"], "W"],
          ],
          ["<", ["get", "year_built"], 1981],
          [">", ["get", "year_built"], 0],
        ] as maplibregl.ExpressionSpecification,
        paint: {
          "line-color": "#D32F2F",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            1.2,
            18,
            2.5,
          ] as maplibregl.ExpressionSpecification,
          "line-opacity": 0.9,
        },
      });
    }
    this.styleReady = true;
  }

  setActiveHazards(keys: HazardKey[]): void {
    if (!this.styleReady) {
      this.active = keys;
      return;
    }
    // Tear down hazards no longer active.
    for (const key of this.active) {
      if (!keys.includes(key)) this.removeHazardLayers(key);
    }
    // Add new ones in declared order so painting is deterministic.
    for (const key of keys) {
      if (!this.active.includes(key)) this.addHazardLayers(key);
    }
    this.active = [...keys];
    this.applyOpacity();
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.applyOpacity();
  }

  setWoodenPre1981(enabled: boolean): void {
    this.wooden = enabled;
    if (this.map.getLayer(WOODEN_LAYER_ID)) {
      this.map.setLayoutProperty(
        WOODEN_LAYER_ID,
        "visibility",
        enabled ? "visible" : "none",
      );
    }
  }

  buildingLayerIds(): string[] {
    // The interaction layer is always present and covers every building, so
    // clicks + viewport coverage queries work regardless of which hazards
    // are active. Including the hazard fills too ensures topmost-rendered
    // features still win the picker when present.
    const ids: string[] = [];
    if (this.map.getLayer(INTERACTION_LAYER_ID)) ids.push(INTERACTION_LAYER_ID);
    for (const key of this.active) {
      const lid = layerIds(key);
      if (this.map.getLayer(lid.noDataFill)) ids.push(lid.noDataFill);
      if (this.map.getLayer(lid.lowConfidence)) ids.push(lid.lowConfidence);
      if (this.map.getLayer(lid.lowConfidenceInZoneMissing)) {
        ids.push(lid.lowConfidenceInZoneMissing);
      }
      if (this.map.getLayer(lid.knownFill)) ids.push(lid.knownFill);
      if (this.map.getLayer(lid.knownSafe)) ids.push(lid.knownSafe);
    }
    return ids;
  }

  destroy(): void {
    for (const key of this.active) this.removeHazardLayers(key);
    for (const id of [INTERACTION_LAYER_ID, BASE_OUTLINE_ID, WOODEN_LAYER_ID]) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    this.active = [];
  }

  private addHazardLayers(key: HazardKey): void {
    const lid = layerIds(key);
    const visual = HAZARD_VISUAL[key];
    const beforeId = this.map.getLayer(WOODEN_LAYER_ID) ? WOODEN_LAYER_ID : undefined;

    // 1. No-data: solid grey beneath the hatch so unknown areas are never
    //    interpreted as low risk by transparency.
    if (!this.map.getLayer(lid.noDataFill)) {
      this.map.addLayer(
        {
          id: lid.noDataFill,
          source: SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          type: "fill",
          filter: coveredFalseFilter(key),
          paint: {
            "fill-color": NO_DATA_COLOR,
            "fill-opacity": this.opacity,
          },
        },
        beforeId,
      );
    }
    if (!this.map.getLayer(lid.noDataHatch)) {
      this.map.addLayer(
        {
          id: lid.noDataHatch,
          source: SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          type: "fill",
          filter: coveredFalseFilter(key),
          paint: {
            "fill-pattern": NO_DATA_PATTERN_ID,
            "fill-opacity": Math.min(1, this.opacity + 0.15),
          },
        },
        beforeId,
      );
    }

    // 2. Low confidence: light grey, never green.
    if (!this.map.getLayer(lid.lowConfidence)) {
      this.map.addLayer(
        {
          id: lid.lowConfidence,
          source: SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          type: "fill",
          filter: unknownConfidenceFilter(key),
          paint: {
            "fill-color": LOW_CONFIDENCE_COLOR,
            "fill-opacity": this.opacity * 0.7,
          },
        },
        beforeId,
      );
    }

    // 3. Known: depth ramp or in-zone color.
    //
    // For in-zone hazards (landslide), we render three separate fills:
    //   - risk_zone (zoneColor) when in_zone is explicitly true
    //   - safe (safeColor) when in_zone is explicitly false
    //   - low-confidence grey when in_zone is missing/null despite trusted
    //     coverage confidence (the pipeline marked coverage but didn't
    //     record the verdict — we must not render this as safe)
    if (!this.map.getLayer(lid.knownFill)) {
      if (HAZARD_USES_IN_ZONE[key]) {
        this.map.addLayer(
          {
            id: lid.knownFill,
            source: SOURCE_ID,
            "source-layer": SOURCE_LAYER,
            type: "fill",
            filter: [
              "all",
              knownConfidenceFilter(key),
              inZoneTrueFilter(key),
            ] as maplibregl.ExpressionSpecification,
            paint: {
              "fill-color": visual.zoneColor,
              "fill-opacity": this.opacity,
            },
          },
          beforeId,
        );
        // Low-confidence fallback for trusted coverage + missing in_zone.
        // This catches landslide buildings where the pipeline records
        // coverage_confidence but omits in_zone entirely.
        if (!this.map.getLayer(lid.lowConfidenceInZoneMissing)) {
          this.map.addLayer(
            {
              id: lid.lowConfidenceInZoneMissing,
              source: SOURCE_ID,
              "source-layer": SOURCE_LAYER,
              type: "fill",
              filter: [
                "all",
                knownConfidenceFilter(key),
                ["!", ["has", `${key}_in_zone`]],
              ] as maplibregl.ExpressionSpecification,
              paint: {
                "fill-color": LOW_CONFIDENCE_COLOR,
                "fill-opacity": this.opacity * 0.7,
              },
            },
            beforeId,
          );
        }
        // Safe layer for explicit in_zone=false.
        if (!this.map.getLayer(lid.knownSafe)) {
          this.map.addLayer(
            {
              id: lid.knownSafe,
              source: SOURCE_ID,
              "source-layer": SOURCE_LAYER,
              type: "fill",
              filter: [
                "all",
                knownConfidenceFilter(key),
                inZoneExplicitlyFalseFilter(key),
              ] as maplibregl.ExpressionSpecification,
              paint: {
                "fill-color": visual.safeColor,
                "fill-opacity": this.opacity,
              },
            },
            beforeId,
          );
        }
      } else {
        this.map.addLayer(
          {
            id: lid.knownFill,
            source: SOURCE_ID,
            "source-layer": SOURCE_LAYER,
            type: "fill",
            filter: knownConfidenceFilter(key),
            paint: {
              "fill-color": depthColorExpression(key),
              "fill-opacity": this.opacity,
            },
          },
          beforeId,
        );
      }
    }
    if (!this.map.getLayer(lid.knownOutline)) {
      this.map.addLayer(
        {
          id: lid.knownOutline,
          source: SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          type: "line",
          filter: knownConfidenceFilter(key),
          paint: {
            "line-color": "#37474F",
            "line-opacity": 0.35,
            "line-width": 0.5,
          },
        },
        beforeId,
      );
    }
  }

  private removeHazardLayers(key: HazardKey): void {
    for (const id of Object.values(layerIds(key))) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
  }

  private applyOpacity(): void {
    for (const key of this.active) {
      const lid = layerIds(key);
      if (this.map.getLayer(lid.noDataFill)) {
        this.map.setPaintProperty(lid.noDataFill, "fill-opacity", this.opacity);
      }
      if (this.map.getLayer(lid.noDataHatch)) {
        this.map.setPaintProperty(
          lid.noDataHatch,
          "fill-opacity",
          Math.min(1, this.opacity + 0.15),
        );
      }
      if (this.map.getLayer(lid.lowConfidence)) {
        this.map.setPaintProperty(
          lid.lowConfidence,
          "fill-opacity",
          this.opacity * 0.7,
        );
      }
      if (this.map.getLayer(lid.lowConfidenceInZoneMissing)) {
        this.map.setPaintProperty(
          lid.lowConfidenceInZoneMissing,
          "fill-opacity",
          this.opacity * 0.7,
        );
      }
      if (this.map.getLayer(lid.knownFill)) {
        this.map.setPaintProperty(lid.knownFill, "fill-opacity", this.opacity);
      }
      if (this.map.getLayer(lid.knownSafe)) {
        this.map.setPaintProperty(lid.knownSafe, "fill-opacity", this.opacity);
      }
    }
  }
}

export const HAZARD_SOURCE_ID = SOURCE_ID;
export const HAZARD_SOURCE_LAYER = SOURCE_LAYER;
