import type { HazardKey } from "@/types/hazard";
import { HAZARD_VISUAL, NO_DATA_COLOR, LOW_CONFIDENCE_COLOR } from "@/hazard/hazardConfig";
import type { I18n } from "@/i18n/I18n";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { LegendItem, ScreenshotOverlayModel } from "./screenshotTypes";

interface BuildArgs {
  activeHazards: HazardKey[];
  i18n: I18n;
  manifest: ManifestRegistry;
  now: Date;
}

export function buildOverlayModel({
  activeHazards,
  i18n,
  manifest,
  now,
}: BuildArgs): ScreenshotOverlayModel {
  const legendItems: LegendItem[] = [];

  legendItems.push({
    swatch: NO_DATA_COLOR,
    pattern: "hatch",
    label: i18n.t("legend.no_data"),
  });
  legendItems.push({
    swatch: LOW_CONFIDENCE_COLOR,
    pattern: "solid",
    label: i18n.t("legend.low_confidence"),
  });
  legendItems.push({
    swatch: HAZARD_VISUAL.river_flood.safeColor,
    pattern: "solid",
    label: i18n.t("legend.safe"),
  });

  for (const key of activeHazards) {
    const visual = HAZARD_VISUAL[key];
    if (visual.depthBands.length > 0) {
      visual.depthBands
        .filter((band) => Number.isFinite(band.ltMeters))
        .forEach((band, i, arr) => {
          const lower = i === 0 ? 0 : arr[i - 1].ltMeters;
          legendItems.push({
            swatch: band.color,
            pattern: "solid",
            label: `${i18n.hazardLabel(key)} · ${lower}–${band.ltMeters} m`,
          });
        });
    } else {
      legendItems.push({
        swatch: visual.zoneColor,
        pattern: "solid",
        label: `${i18n.hazardLabel(key)} · ${i18n.t("legend.risk_zone")}`,
      });
    }
  }

  const activeLabel =
    activeHazards.length > 0
      ? activeHazards.map((k) => i18n.hazardLabel(k)).join(" / ")
      : "—";

  // Build a per-hazard "source · year" line for each active layer. Match a
  // source by hazard suffix in dataset_id (fld/tnm/htd/ifld/lsld). For
  // citable exports, the dataset year per hazard is what readers need —
  // showing only the global dataset_year misleads when hazard datasets
  // were generated in different years.
  const attributionLines: string[] = [
    `${i18n.t("attribution")} · dataset ${manifest.datasetYear}`,
  ];
  const suffixForHazard: Record<HazardKey, string> = {
    river_flood: "fld",
    inland_flood: "ifld",
    tsunami: "tnm",
    storm_surge: "htd",
    landslide: "lsld",
  };
  for (const key of activeHazards) {
    const suffix = suffixForHazard[key];
    const stats = manifest.getHazardStats(key);
    const sourceIds = Object.keys(manifest.manifest.sources).filter((id) =>
      id.endsWith(`-${suffix}`),
    );
    const entries = manifest.getSources(sourceIds);
    const captions = entries
      .map((e) => manifest.datasetCaption(e, i18n.locale))
      .slice(0, 2);
    // Always emit a line per active hazard so the screenshot can't silently
    // hide that the layer was on. If we have no source entry and no coverage,
    // say so explicitly; readers must be able to tell "no data" apart from
    // "we forgot to attribute".
    const right =
      captions.length > 0
        ? `${captions.join(" / ")}${stats && stats.covered_count === 0 ? ` · ${i18n.t("legend.no_data")}` : ""}`
        : i18n.t("legend.no_data");
    attributionLines.push(`${i18n.hazardLabel(key)}: ${right}`);
  }

  return {
    title: `${i18n.t("app.title")} — ${manifest.cityName}`,
    subtitle: activeLabel,
    legendItems,
    coverageLines: [
      `${i18n.t("coverage.city")}: ${manifest.nBuildings.toLocaleString()} ${i18n.t("coverage.buildings")}`,
    ],
    attributionLines,
    disclaimer: i18n.t("disclaimer.short"),
    timestamp: now.toISOString(),
  };
}
