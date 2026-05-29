import type { HazardKey } from "@/types/hazard";

export interface HazardVisualConfig {
  key: HazardKey;
  safeColor: string;
  /**
   * Depth band breakpoints in meters (exclusive upper bound).
   * Used only for depth-based hazards (river_flood / inland_flood / tsunami / storm_surge).
   */
  depthBands: Array<{ ltMeters: number; color: string }>;
  /** Color for risk_zone (landslide). */
  zoneColor: string;
}

export const HAZARD_VISUAL: Record<HazardKey, HazardVisualConfig> = {
  river_flood: {
    key: "river_flood",
    safeColor: "#2E7D32",
    zoneColor: "#7B1FA2",
    depthBands: [
      { ltMeters: 0.5, color: "#FDD835" },
      { ltMeters: 3, color: "#FB8C00" },
      { ltMeters: 5, color: "#E53935" },
      { ltMeters: Infinity, color: "#7B1FA2" },
    ],
  },
  inland_flood: {
    key: "inland_flood",
    safeColor: "#2E7D32",
    zoneColor: "#7B1FA2",
    depthBands: [
      { ltMeters: 0.5, color: "#FFEB3B" },
      { ltMeters: 1, color: "#FFB300" },
      { ltMeters: 3, color: "#EF6C00" },
      { ltMeters: Infinity, color: "#C62828" },
    ],
  },
  tsunami: {
    key: "tsunami",
    safeColor: "#2E7D32",
    zoneColor: "#0D47A1",
    depthBands: [
      { ltMeters: 1, color: "#80DEEA" },
      { ltMeters: 3, color: "#26C6DA" },
      { ltMeters: 5, color: "#0288D1" },
      { ltMeters: Infinity, color: "#01579B" },
    ],
  },
  storm_surge: {
    key: "storm_surge",
    safeColor: "#2E7D32",
    zoneColor: "#4A148C",
    depthBands: [
      { ltMeters: 1, color: "#B39DDB" },
      { ltMeters: 3, color: "#7E57C2" },
      { ltMeters: 5, color: "#512DA8" },
      { ltMeters: Infinity, color: "#311B92" },
    ],
  },
  landslide: {
    key: "landslide",
    safeColor: "#2E7D32",
    zoneColor: "#8B4513",
    depthBands: [],
  },
};

export const NO_DATA_COLOR = "#9E9E9E";
export const LOW_CONFIDENCE_COLOR = "#BDBDBD";
