# Design

The technical spec for plateau-risk-lens. If you're contributing, read this
before changing anything in `src/map/`, `src/hazard/`, or `src/export/` — the
rules here are load-bearing.

## Positioning

A **static, citable, 2D web tool** that overlays PLATEAU hazard zones onto
individual buildings. Credibility over flash.

- **Not** a physical simulation. **Not** a real-time disaster warning system.
- **Not** a damage-estimation calculator ("if today's M7..." is out of scope).
- **Not** a 3D building viewer (a separate project handles that).

The audience is the general public, journalists, and disaster-education
programs — people who need an honest, citable view of official hazard data,
not researchers who want raw GIS.

## Core invariant: honesty over green

Every rendering path enforces three states with no overlap:

| Data state | Render |
|---|---|
| `covered=false` (building outside any survey extent) | grey fill + diagonal hatch |
| `coverage_confidence="unknown"` or missing | light grey solid; ⚠ marker in property card |
| `covered=true && depth_max ∈ {null, ≤0}` | safe green |
| `covered=true && depth_max > 0` | depth-banded color (yellow→orange→red→purple) |
| `covered=true && in_zone=true` (landslide) | zone color |
| `covered=true && in_zone=false` (landslide) | safe green |
| `covered=true` but `in_zone` missing (landslide) | low-confidence grey |

The repo's load-bearing test —
[`e2e/no-green-on-nodata.spec.ts`](../e2e/no-green-on-nodata.spec.ts) —
asserts that no `covered=false` building ever renders a safe-green pixel.
Touching `HazardLayerRegistry`, `hazardFilters`, `hazardPaint`, or
`hazardClassification` requires this test to pass on Chromium, Firefox, and
WebKit.

## Data contract

Buildings are encoded as PMTiles vector tiles. Each feature carries (per
hazard `*` ∈ {`river_flood`, `inland_flood`, `tsunami`, `storm_surge`,
`landslide`}):

| Field | Type | Meaning |
|---|---|---|
| `*_covered` | bool | Building is inside the survey extent for this hazard |
| `*_coverage_confidence` | enum?\* | Trust level for the covered/uncovered verdict |
| `*_coverage_source_ids` | string? | Comma-separated source ids proving coverage |
| `*_depth_max` / `*_in_zone` | float? / bool? | Risk value (depth in m for floods/tsunami, in/out for landslide) |
| `*_hit_source_ids` | string? | Source ids that recorded a positive hit |

\*Trusted confidence values: `explicit_polygon`, `declared_full_admin`,
`inundation_bounded`. Anything else (including `unknown`, `null`, missing, or
a pipeline typo) collapses into low-confidence — never safe.

Coverage source ids and hit source ids are **never** combined into one list.
The property card and the GeoJSON export keep them in separate sections;
that distinction is the difference between "this survey looked at the
building" and "this survey found a risk here."

## Architecture

```
src/
  app/         Application shell, zustand store, city catalog
  map/         MapLibre lifecycle, layer registry, picker, controls
  hazard/      Three-state classification and paint config (pure, testable)
  manifest/    manifest.json loader + schema validator + source_id parser
  export/      Screenshot composer + FGB exporter (both lazy-loaded)
  coverage/    City + viewport coverage meters
  i18n/        ja/en strings + dataset caption fallbacks
  ui/          Pure React components with no MapLibre access
  types/       Shared types
  utils/       Pure helpers (bbox, bool normalization, download)
  tests/       Vitest unit tests
e2e/           Playwright tests (smoke + visual regression)
scripts/       One-off scripts (fetch artifacts, inject FGB index, OG images)
```

### Key components

- **`MapStage`** — the only component that holds a `maplibregl.Map`
  instance. Sets `canvasContextAttributes.preserveDrawingBuffer: true` so
  the canvas can be exported, disables MapLibre's default attribution
  control (we render attribution ourselves to control the citation), and
  exposes an imperative handle (`getCanvas`, `getViewportBbox`,
  `waitForIdle`, `queryRenderedBuildings`).

- **`HazardLayerRegistry`** — manages the MapLibre layer stack per hazard.
  For each active hazard it creates a stack:
  `nodata-fill` + `nodata-hatch` + `lowconf-fill` (+ `lowconf-inzone-missing`
  for landslide) + `known-fill` (+ `known-fill-safe` for landslide) +
  `known-outline`. The order matters — hatch must sit above the grey fill,
  and the wooden-pre-1981 highlight (`buildings-wooden-pre1981`) must sit
  above everything so it doesn't get masked.

  An invisible `buildings-interaction` fill is added at base layer so
  clicks and viewport coverage queries work even when zero hazard layers
  are active.

- **`FeaturePicker`** — queries `map.queryRenderedFeatures` against the
  layers above, normalizes the feature properties (MVT booleans come in as
  `0/1/"0"/"1"`), and produces a `PropertyCardViewModel` with sources
  resolved through `ManifestRegistry`.

- **`ScreenshotComposer`** — exports a PNG by reading `map.getCanvas()`,
  drawing the DOM overlay (legend, attribution, dataset year per active
  hazard, timestamp, disclaimer) onto a final canvas, and emitting a Blob.
  Refuses to silently emit a CORS-tainted canvas; `assertCanvasReadable`
  throws `ScreenshotError` with a clear message instead.

- **`FgbExporter`** — bbox-exports GeoJSON by reading FlatGeobuf via HTTP
  range queries (`flatgeobuf` deserialize with bbox). Iterates over
  `manifest.artifacts.fgb_files` to support multi-ward cities. Preflights
  range support with a `Range: bytes=0-15` GET that must return HTTP 206;
  HEAD with `Accept-Ranges` is unreliable across hosts.

- **`ManifestRegistry`** — validates `manifest.json` against
  `manifestSchema.ts` at the load boundary (clear errors if the upstream
  pipeline drifts), then exposes typed accessors. The caption fallback
  ladder is: manifest title (locale-specific) → local `sourceCaptions`
  table by dataset suffix → raw `dataset_id`.

- **`CoverageMeter`** — produces both city-level (from manifest) and
  viewport-level (live `queryRenderedFeatures`) coverage. Viewport
  bucketing reuses `classifyHazard`, so the badge always matches what
  the user sees painted.

### State

`zustand` for UI state — locale, active hazards, opacity, selected
feature, export status. The MapLibre map instance is **not** in zustand;
it's held by `MapStage` and exposed via an imperative ref. Large GeoJSON
features in flight never enter the store.

### What is on the map vs. in the property card

- The **map** distinguishes no-data (hatch) from low-confidence (solid
  grey) from safe (green) from depth bands (yellow/orange/red/purple).
- The **property card** adds a ⚠ marker on no-data and low-confidence
  rows so the user understands they're not safe, just unknown.
- Wooden pre-1981 buildings get a red outline on the map AND a red
  banner in the property card. Missing structure or missing year never
  promotes a building to "not wooden pre-1981" — they show `—` instead.

## Testing strategy

| Layer | What it asserts | Location |
|---|---|---|
| Unit | Honesty invariants, source id parsing, MVT bool normalization, manifest validation, classifier edge cases | `src/tests/unit/` |
| Unit | Pure transforms: bbox math, i18n, source captions, coverage meter, overlay model | `src/tests/unit/` |
| E2E smoke | App boots, locale toggle works, manifest load handles missing data | `e2e/smoke.spec.ts` |
| E2E visual | The covered-false-is-never-green invariant against a real WebGL canvas, across Chromium + Firefox + WebKit | `e2e/no-green-on-nodata.spec.ts` |

The visual test self-skips if no artifacts are available locally, so PRs
from forks without the data don't fail on this — but maintainers always
re-run it before merging changes to paint or filters.

## HTTP requirements

Artifact origin must serve PMTiles, FlatGeobuf, and `manifest.json` with:

```
Access-Control-Allow-Origin: *
Accept-Ranges: bytes
```

PMTiles and FlatGeobuf both depend on HTTP byte-range queries
(`HTTP/2 206` for `Range: bytes=0-100`). The screenshot exporter throws a
clear `ScreenshotError` if the WebGL canvas turns out to be CORS-tainted;
the FGB exporter throws `FgbExportError` if range support is missing.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the production setup.

## Won't do

These are out of scope and PRs adding them will be declined. The
rationale is positioning, not bandwidth — we deliberately do not want to
become any of these things:

- **Physical simulation** of floods or quakes (water flow models, finite-
  element analyses, intensity propagation). Use the hazard polygons MLIT
  publishes; rendering them honestly is the whole job.
- **Damage estimation or "if today's M7" calculators.** Estimating
  casualties or repair costs gamifies disasters; the project rejects
  that framing.
- **Real-time warnings or JMA fusion.** Other projects do real-time well;
  this one is static, citable, and stable across years.
- **User accounts, history, or saved bookmarks.** The tool is a viewer;
  state lives in the URL when it needs to persist.
- **3D building rendering.** Handled by a sibling project; this one stays
  2D on purpose.
- **Earthquake intensity layers** (J-SHIS / similar) — PLATEAU doesn't
  publish that data, and fusing external sources requires a different
  trust model.
