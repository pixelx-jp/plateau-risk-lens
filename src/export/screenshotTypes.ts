import type { HazardKey } from "@/types/hazard";
import type { Locale } from "@/i18n/types";

export interface LegendItem {
  swatch: string;
  pattern?: "hatch" | "solid";
  label: string;
}

export interface ScreenshotOverlayModel {
  title: string;
  subtitle: string;
  legendItems: LegendItem[];
  coverageLines: string[];
  attributionLines: string[];
  disclaimer: string;
  timestamp: string;
}

export interface ScreenshotInput {
  mapCanvas: HTMLCanvasElement;
  pixelRatio: number;
  locale: Locale;
  activeHazards: HazardKey[];
  cityName: string;
  cityCode: string;
  datasetYear: number;
  overlay: ScreenshotOverlayModel;
}
