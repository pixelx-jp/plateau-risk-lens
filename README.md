<p align="center">
  <a href="https://yodolabs.jp">
    <img src="docs/assets/yodo-labs-logo.svg" alt="Yodo Labs" width="180" />
  </a>
</p>

<h1 align="center">plateau-risk-lens</h1>

<p align="center">
  <strong>Static, citable disaster-risk explainer for Japan's PLATEAU open data.</strong><br/>
  Not a real-time forecasting system. Not a physical simulation.
</p>

<p align="center">
  <a href="https://github.com/pixelx-jp/plateau-risk-lens/actions/workflows/ci.yml"><img src="https://github.com/pixelx-jp/plateau-risk-lens/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.mlit.go.jp/plateau/"><img src="https://img.shields.io/badge/Data-CC%20BY%204.0-orange.svg" alt="Data: CC BY 4.0" /></a>
</p>

<p align="center">
  <a href="https://risk-lens.plateau.yodolabs.jp"><strong>🌐 Live demo →</strong></a>
  &nbsp;·&nbsp;
  <a href="./README.ja.md">日本語版 README →</a>
</p>

---

A pure-client 2D MapLibre app that overlays PLATEAU hazard zones — river
flood, inland flood, tsunami, storm surge, landslide — onto individual
buildings. It reads PMTiles + FlatGeobuf artifacts produced by
[plateau-core](https://github.com/pixelx-jp/plateau-bridge) and renders
them with strict three-state honesty:

| State | Render |
|---|---|
| `covered=false` (no survey data) | grey + diagonal hatch — **never green** |
| `coverage_confidence` not trusted | light grey — **never green** |
| `covered=true && depth_max ∈ {null, ≤0}` | green (safe) |
| `covered=true && depth_max > 0` | yellow → orange → red → purple by depth |
| `landslide_in_zone=true` | brown (zone) |

The most important automated test in the repo asserts that no-data
buildings render zero "safe green" pixels across Chromium, Firefox, and
WebKit. See [`e2e/no-green-on-nodata.spec.ts`](./e2e/no-green-on-nodata.spec.ts).

## Why this exists

PLATEAU is the world's only open dataset combining per-building semantics
with multiple hazard zone polygons. PLATEAU VIEW serves GIS professionals;
this tool serves the general public, media, and educators with a simple,
citable risk explanation — without ever drifting into "real-time" framing
or gamification of disasters.

See [`docs/DESIGN.md`](./docs/DESIGN.md) for the full design rationale and
the explicit list of capabilities we won't build.

## Quick start

```sh
git clone https://github.com/pixelx-jp/plateau-risk-lens
cd plateau-risk-lens
npm install
npm run dev   # → http://localhost:5173
```

You also need hazard data. Pick one path:

| Path | When to use | How |
|---|---|---|
| **Live origin** | Just want to see the app run | `echo 'VITE_ARTIFACT_BASE_ROOT=https://artifacts.plateau.yodolabs.jp' > .env.local` |
| **Fetch bundles** | Want a few cities locally for offline / fast dev | `scripts/fetch-artifacts.sh shibuya edogawa kamakura` |
| **Sibling clone** | Already working on plateau-core | sibling-checkout `plateau-core/` next to this repo |

Bundles are pulled from [plateau-core's GitHub Releases](https://github.com/pixelx-jp/plateau-bridge/releases/tag/data-v1) (~10–600 MB per city). Extracted to `.artifacts/` (gitignored, never bundled into the SPA build).

## Tests

```sh
npm run typecheck     # tsc
npm test              # vitest — 68 honesty invariants and pure-function tests
npm run test:e2e      # Playwright — smoke + cross-browser visual regression
```

## Deployment

Maintainers deploy via GitHub Actions to Cloudflare Pages. PR previews are
automatic. Contributors don't need any Cloudflare account or `wrangler`
install. See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the one-time
setup.

## Stack

- TypeScript + React 18
- MapLibre GL JS 5 + PMTiles (vector tiles, point-and-click queries)
- FlatGeobuf (HTTP range queries for full-precision bbox exports)
- zustand (UI state)
- Vite 6 + Vitest 3 + Playwright

Bundle: ~357 KB initial gzip; export modules lazy-loaded.

## Supported cities

24 cities — all 23 Tokyo wards plus Kamakura. Additional cities
(Yokohama, Osaka, Nagoya, Fukuoka, Sapporo) are produced by
[plateau-core](https://github.com/pixelx-jp/plateau-bridge) and will
be added to the production origin over time. Adding a city: see
[CONTRIBUTING.md](./CONTRIBUTING.md#adding-a-city).

## License & attribution

- **Source code:** [MIT](./LICENSE), © PixelX Inc. (ピクセルエックス株式会社) and contributors.
- **Hazard data:** © Project PLATEAU / 国土交通省 (MLIT), [CC BY 4.0](https://www.mlit.go.jp/plateau/).

Every screenshot and exported GeoJSON carries the data attribution and a
disclaimer that this is static analysis, not real-time forecasting.
**Please preserve those notices when republishing.**

## About

Built and maintained by [Yodo Labs](https://yodolabs.jp), a research and
product lab inside [PixelX Inc.](https://yodolabs.jp) (ピクセルエックス株式会社)
working on civic and disaster-data infrastructure for Japan.

- Website: <https://yodolabs.jp>
- Maintainer contact: [pan@yodolabs.jp](mailto:pan@yodolabs.jp)
- Security reports: [pan@yodolabs.jp](mailto:pan@yodolabs.jp) (please don't open a public issue)

### Related projects

- [plateau-core](https://github.com/pixelx-jp/plateau-bridge) — pipeline that
  produces the PMTiles + FlatGeobuf + manifest artifacts consumed here
- Other Yodo Labs PLATEAU tooling is in progress; check the org page for updates
