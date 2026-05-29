import { create } from "zustand";
import type { FeatureProps } from "@/types/feature";
import type { HazardKey } from "@/types/hazard";
import type { Locale } from "@/i18n/types";

const MAX_ACTIVE = 3;

export type ExportStatus =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done"; label: string };

export interface ViewportCoverage {
  buildings: number;
  yearKnown: number;
  structureKnown: number;
  perHazard: Record<HazardKey, { covered: number; noData: number; lowConfidence: number }>;
}

interface AppState {
  locale: Locale;
  cityCode: string;
  activeHazards: HazardKey[];
  hazardOpacity: number;
  woodenPre1981: boolean;
  selectedFeature: FeatureProps | null;
  viewportCoverage: ViewportCoverage | null;
  exportStatus: ExportStatus;
}

interface AppActions {
  setLocale(locale: Locale): void;
  setCityCode(code: string): void;
  toggleHazard(key: HazardKey): void;
  setActiveHazards(keys: HazardKey[]): void;
  setHazardOpacity(opacity: number): void;
  setWoodenPre1981(enabled: boolean): void;
  setSelectedFeature(feature: FeatureProps | null): void;
  setViewportCoverage(coverage: ViewportCoverage | null): void;
  setExportStatus(status: ExportStatus): void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  locale: "en",
  cityCode: "13113",
  activeHazards: ["river_flood"],
  hazardOpacity: 0.7,
  woodenPre1981: false,
  selectedFeature: null,
  viewportCoverage: null,
  exportStatus: { kind: "idle" },

  setLocale: (locale) => set({ locale }),
  setCityCode: (cityCode) => set({ cityCode, selectedFeature: null }),
  toggleHazard: (key) =>
    set((state) => {
      const present = state.activeHazards.includes(key);
      if (present) {
        return { activeHazards: state.activeHazards.filter((k) => k !== key) };
      }
      const next = [...state.activeHazards, key];
      while (next.length > MAX_ACTIVE) next.shift();
      return { activeHazards: next };
    }),
  setActiveHazards: (keys) => set({ activeHazards: keys.slice(0, MAX_ACTIVE) }),
  setHazardOpacity: (hazardOpacity) => set({ hazardOpacity }),
  setWoodenPre1981: (woodenPre1981) => set({ woodenPre1981 }),
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
  setViewportCoverage: (viewportCoverage) => set({ viewportCoverage }),
  setExportStatus: (exportStatus) => set({ exportStatus }),
}));
