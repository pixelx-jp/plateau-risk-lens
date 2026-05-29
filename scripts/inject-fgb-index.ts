#!/usr/bin/env tsx
/**
 * Patch plateau-core city manifests in place with `artifacts.fgb_files`,
 * listing every `buildings/*.fgb` next to the manifest.
 *
 * Required step before uploading multi-ward city outputs (Osaka, Yokohama,
 * Fukuoka, Nagoya, ...) to a static host like R2 — otherwise FgbExporter
 * falls back to `{city_code}.fgb`, which doesn't exist for those cities.
 *
 * Usage:
 *   npx tsx scripts/inject-fgb-index.ts                # defaults to ../plateau-core
 *   npx tsx scripts/inject-fgb-index.ts <dir>          # any layout
 *
 * Detects both layouts:
 *   - `<dir>/out_<slug>/{manifest.json, buildings/*.fgb}`  (plateau-core)
 *   - `<dir>/<slug>/{manifest.json, buildings/*.fgb}`      (this repo's public/artifacts)
 */
import fs from "node:fs";
import path from "node:path";

const arg = process.argv[2];
const root = arg
  ? path.resolve(arg)
  : path.resolve(import.meta.dirname, "../../plateau-core");

if (!fs.existsSync(root)) {
  console.error(`directory not found: ${root}`);
  process.exit(1);
}

const candidates: string[] = [];
for (const name of fs.readdirSync(root)) {
  const full = path.join(root, name);
  if (!fs.statSync(full).isDirectory()) continue;
  if (
    fs.existsSync(path.join(full, "manifest.json")) &&
    fs.existsSync(path.join(full, "buildings"))
  ) {
    candidates.push(full);
  }
}

if (candidates.length === 0) {
  console.log(`No manifest+buildings/ directories found under ${root}`);
  process.exit(0);
}

let patched = 0;
for (const cityDir of candidates) {
  const manifestPath = path.join(cityDir, "manifest.json");
  const buildingsDir = path.join(cityDir, "buildings");

  const fgbFiles = fs
    .readdirSync(buildingsDir)
    .filter((name) => name.endsWith(".fgb"))
    .sort();

  if (fgbFiles.length === 0) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  const artifacts =
    (manifest.artifacts as Record<string, unknown> | undefined) ?? {};
  const existing = artifacts.fgb_files;
  if (
    Array.isArray(existing) &&
    existing.length === fgbFiles.length &&
    existing.every((v, i) => v === fgbFiles[i])
  ) {
    continue; // already up to date
  }
  artifacts.fgb_files = fgbFiles;
  manifest.artifacts = artifacts;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  patched += 1;
  console.log(`✓ ${path.basename(cityDir)} (${fgbFiles.length} fgb files)`);
}

console.log(`\nPatched ${patched} manifest(s).`);
