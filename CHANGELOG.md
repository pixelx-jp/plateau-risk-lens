# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial MVP: 2D MapLibre map with 5 hazard layers, three-state honesty
  rendering, property card with split coverage/risk source lists, wooden
  pre-1981 highlight, opacity slider, ja/en localization
- Screenshot export (canvas + DOM overlay composition, CORS-safe)
- FlatGeobuf bbox GeoJSON export with metadata
- City + viewport coverage badges
- Five sample cities: Shibuya, Edogawa, Koto, Kamakura, Osaka
- Vitest unit tests for honesty invariants
- Playwright e2e tests including `no-green-on-nodata` visual regression
- GitHub Actions CI (typecheck + unit + e2e smoke)
- GitHub Actions deploy to Cloudflare Pages with PR previews
- OG image generation script (5 sample cities)
- Bundle splitting: maplibre / pmtiles / react-vendor / lazy export chunks
