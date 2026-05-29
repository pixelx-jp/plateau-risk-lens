/**
 * Defensive validator for plateau-core manifest.json shape. The pipeline owns
 * this format; if it drifts (renamed field, swapped type), we want to fail
 * loudly at load time with a clear message rather than crash deep inside
 * React rendering.
 *
 * Intentionally hand-rolled — adding zod / valibot for a single boundary
 * would cost more bundle than it's worth.
 */
import type { PipelineManifest } from "@/types/manifest";

export class ManifestValidationError extends Error {
  constructor(public readonly path: string, message: string) {
    super(`manifest.json: ${path}: ${message}`);
    this.name = "ManifestValidationError";
  }
}

const HAZARD_KINDS = new Set([
  "river_flood",
  "inland_flood",
  "tsunami",
  "storm_surge",
  "landslide",
]);

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new ManifestValidationError(`${path}.${key}`, `expected string, got ${typeOf(v)}`);
  }
  return v;
}

function requireNumber(obj: Record<string, unknown>, key: string, path: string): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new ManifestValidationError(`${path}.${key}`, `expected number, got ${typeOf(v)}`);
  }
  return v;
}

function requireObject(
  obj: Record<string, unknown>,
  key: string,
  path: string,
): Record<string, unknown> {
  const v = obj[key];
  if (!isObject(v)) {
    throw new ManifestValidationError(`${path}.${key}`, `expected object, got ${typeOf(v)}`);
  }
  return v;
}

function requireArray(obj: Record<string, unknown>, key: string, path: string): unknown[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new ManifestValidationError(`${path}.${key}`, `expected array, got ${typeOf(v)}`);
  }
  return v;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export function validateManifest(input: unknown): PipelineManifest {
  if (!isObject(input)) {
    throw new ManifestValidationError("$", `expected object, got ${typeOf(input)}`);
  }

  // Required top-level scalars.
  requireString(input, "attribution", "$");
  requireString(input, "city_code", "$");
  requireString(input, "city_name", "$");
  requireString(input, "generated_at", "$");
  requireNumber(input, "n_buildings", "$");
  requireNumber(input, "dataset_year", "$");

  // datasets[]
  const datasets = requireArray(input, "datasets", "$");
  for (let i = 0; i < datasets.length; i++) {
    if (typeof datasets[i] !== "string") {
      throw new ManifestValidationError(`$.datasets[${i}]`, "expected string");
    }
  }

  // sources: Record<source_id, { source_id, dataset_id, year, url? }>
  const sources = requireObject(input, "sources", "$");
  for (const [id, raw] of Object.entries(sources)) {
    const path = `$.sources["${id}"]`;
    if (!isObject(raw)) {
      throw new ManifestValidationError(path, `expected object, got ${typeOf(raw)}`);
    }
    requireString(raw, "source_id", path);
    requireString(raw, "dataset_id", path);
    requireNumber(raw, "year", path);
  }

  // coverage_stats: Array<{ kind, covered_count, hit_count, ... }>
  const stats = requireArray(input, "coverage_stats", "$");
  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const path = `$.coverage_stats[${i}]`;
    if (!isObject(stat)) {
      throw new ManifestValidationError(path, `expected object, got ${typeOf(stat)}`);
    }
    const kind = requireString(stat, "kind", path);
    if (!HAZARD_KINDS.has(kind)) {
      throw new ManifestValidationError(
        `${path}.kind`,
        `unknown hazard kind "${kind}"; expected one of ${[...HAZARD_KINDS].join(", ")}`,
      );
    }
    requireNumber(stat, "covered_count", path);
    requireNumber(stat, "hit_count", path);
  }

  // field_coverage: Record<string, number 0..1>
  const fc = requireObject(input, "field_coverage", "$");
  for (const [field, raw] of Object.entries(fc)) {
    if (typeof raw !== "number" || raw < 0 || raw > 1) {
      throw new ManifestValidationError(
        `$.field_coverage.${field}`,
        `expected number in [0, 1], got ${typeOf(raw)}=${raw}`,
      );
    }
  }

  // Optional: artifacts.fgb_files (string[]). Injected by dev middleware,
  // required at production for multi-ward cities.
  if (input.artifacts !== undefined) {
    if (!isObject(input.artifacts)) {
      throw new ManifestValidationError(
        "$.artifacts",
        `expected object or absent, got ${typeOf(input.artifacts)}`,
      );
    }
    const fgb = input.artifacts.fgb_files;
    if (fgb !== undefined) {
      if (!Array.isArray(fgb)) {
        throw new ManifestValidationError(
          "$.artifacts.fgb_files",
          `expected array, got ${typeOf(fgb)}`,
        );
      }
      for (let i = 0; i < fgb.length; i++) {
        if (typeof fgb[i] !== "string") {
          throw new ManifestValidationError(
            `$.artifacts.fgb_files[${i}]`,
            "expected string",
          );
        }
      }
    }
  }

  return input as unknown as PipelineManifest;
}
