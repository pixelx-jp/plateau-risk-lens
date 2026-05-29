import type { SourceId } from "@/types/feature";

// plateau-core encodes source_ids as a compact string:
//   - Multiple sources are separated by `,` (we also tolerate `|` defensively).
//   - Each entry may carry a `+confidence` suffix, e.g.
//       "plateau-13113-shibuya-ku-2023-fld+inundation_bounded"
//     The suffix records *which* confidence value the source produced; the
//     ManifestRegistry keys on the source_id alone, so we strip it here.
//     Reference: out_*/buildings.parquet shows this format on every covered
//     row where the coverage was inferred from an inundation polygon.
const ENTRY_SEPARATOR = /[,|]/;

export function parseSourceIds(value: unknown): SourceId[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed === "") return [];
  return trimmed
    .split(ENTRY_SEPARATOR)
    .map((entry) => {
      const plus = entry.indexOf("+");
      return (plus === -1 ? entry : entry.slice(0, plus)).trim();
    })
    .filter((id) => id.length > 0);
}
