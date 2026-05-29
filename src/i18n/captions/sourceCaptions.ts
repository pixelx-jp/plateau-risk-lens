/**
 * Local fallback captions for plateau-core source_ids whose manifest entries
 * don't carry a `title` field (which is the current pipeline reality — see
 * any city's manifest.json).
 *
 * Pattern: `plateau-{city_code}-{city_name}-{year}-{type_suffix}`
 *   e.g. `plateau-13113-shibuya-ku-2023-fld`
 *
 * The type suffix maps to a hazard or dataset kind. We caption based on the
 * suffix; the city name is decoded from the second segment.
 *
 * Plan priority (sourceCaption):
 *   1. manifest entry title.locale     — handled in ManifestRegistry
 *   2. local fallback caption          — this file
 *   3. dataset_id                      — final fallback
 */
import type { Locale } from "../types";
import type { ManifestEntry } from "@/types/manifest";

interface KindCaption {
  ja: string;
  en: string;
}

// PLATEAU dataset type suffixes (subset that risk-lens cares about).
const KIND_BY_SUFFIX: Record<string, KindCaption> = {
  bldg: { ja: "建築物モデル", en: "Building model" },
  urf: { ja: "都市計画情報", en: "Urban planning information" },
  fld: { ja: "洪水浸水想定区域図", en: "Flood inundation assumption map" },
  tnm: { ja: "津波浸水想定区域図", en: "Tsunami inundation assumption map" },
  htd: { ja: "高潮浸水想定区域図", en: "Storm surge inundation assumption map" },
  ifld: { ja: "内水浸水想定区域図", en: "Inland flood inundation assumption map" },
  lsld: { ja: "土砂災害警戒区域図", en: "Landslide hazard zone map" },
};

interface ParsedDatasetId {
  cityCode: string | null;
  cityName: string | null;
  year: number | null;
  suffix: string | null;
}

export function parseDatasetId(datasetId: string): ParsedDatasetId {
  // Match plateau-{code}-{name-with-hyphens}-{year}-{suffix}
  // Name may contain hyphens (e.g. "shibuya-ku"), so we anchor on year (\d{4})
  // followed by the suffix.
  const match = datasetId.match(/^plateau-(\d+)-(.+)-(\d{4})-([a-z]+)$/i);
  if (!match) return { cityCode: null, cityName: null, year: null, suffix: null };
  return {
    cityCode: match[1],
    cityName: match[2],
    year: Number(match[3]),
    suffix: match[4].toLowerCase(),
  };
}

export function captionForSource(
  entry: Pick<ManifestEntry, "dataset_id" | "year" | "title">,
  locale: Locale,
): string | null {
  // Level 1: explicit title from manifest.
  const explicit = entry.title?.[locale] ?? entry.title?.ja ?? entry.title?.en;
  if (explicit) {
    return entry.year ? `${explicit} (${entry.year})` : explicit;
  }

  // Level 2: local fallback table.
  const parsed = parseDatasetId(entry.dataset_id);
  if (parsed.suffix && KIND_BY_SUFFIX[parsed.suffix]) {
    const kind = KIND_BY_SUFFIX[parsed.suffix][locale];
    const year = entry.year ?? parsed.year;
    return year ? `${kind} (${year})` : kind;
  }

  return null;
}
