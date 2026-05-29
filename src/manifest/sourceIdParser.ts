import type { SourceId } from "@/types/feature";

// Pipeline emits source_ids as comma-separated strings (verified against
// plateau-core test fixtures). Tolerate `|` and whitespace as defensive
// fallbacks since the format is owned by the pipeline.
const SEPARATOR = /[,|]/;

export function parseSourceIds(value: unknown): SourceId[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed === "") return [];
  return trimmed
    .split(SEPARATOR)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}
