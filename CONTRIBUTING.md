# Contributing to plateau-risk-lens

Thanks for considering a contribution. This project is maintained by
[Yodo Labs](https://yodolabs.jp) / PixelX Inc. (ピクセルエックス株式会社) and
released under the MIT license. Its job is to render Japan's open hazard
data **honestly** — so most of our review attention is on the correctness
of how `covered`, `coverage_confidence`, and `depth_max` are interpreted
in pixels.

Read [`docs/DESIGN.md`](./docs/DESIGN.md) before changing anything in the
rendering or export paths.

## Ground rules

1. **`covered=false` is never green.** Period. This is the one invariant that
   matters most. Any change touching `HazardLayerRegistry`, `hazardFilters`,
   `hazardPaint`, or `hazardClassification` must keep the
   `e2e/no-green-on-nodata.spec.ts` test passing.
2. **Sources stay split.** `*_coverage_source_ids` (proves coverage) and
   `*_hit_source_ids` (proves risk hit) are different lists in the UI and in
   exported metadata. Don't merge them.
3. **No physical simulation or "what-if" scenarios.** The project's positioning
   is *static, citable risk explanation*. PRs that add quake simulators,
   damage estimates, or "if today's M7" features will be declined.
4. **Bilingual from day one.** Any user-visible string goes through
   `I18n.t()` with both `en.ts` and `ja.ts` entries.

## Local setup

Requires Node ≥ 20.

```sh
git clone <repo>
cd plateau-risk-lens
npm install

# Dev server reads from ../plateau-core/out_<slug>/ via a Vite middleware.
# If you have plateau-core checked out as a sibling, you're done.
# Otherwise point at a hosted artifact origin:
echo 'VITE_ARTIFACT_BASE_ROOT=https://artifacts.plateau-tools.dev' > .env.local

npm run dev
```

## Running the test suite

```sh
npm run typecheck     # tsc --noEmit
npm test              # vitest — pure-function honesty invariants
npx playwright install chromium  # one-time
npm run test:e2e      # Playwright smoke + visual regression
```

The `no-green-on-nodata` test launches a real browser, activates a hazard with
0% coverage in Shibuya, and asserts the rendered canvas has < 0.1% safe-green
pixels. If you change paint rules, run this locally before opening a PR.

## Project layout

```
src/
  app/         — Application shell, routing, state store
  map/         — MapLibre lifecycle, layer registry, picker, controls
  hazard/      — Three-state classification, paint config (pure, testable)
  manifest/    — manifest.json loader + source_id parser
  export/      — Screenshot composer + FGB exporter (lazy-loaded)
  coverage/    — City + viewport coverage meters
  i18n/        — ja/en strings and helpers
  ui/          — Pure React components, no MapLibre access
  types/       — Shared types
  utils/       — Pure helpers
  tests/       — Vitest unit tests
e2e/           — Playwright tests
scripts/       — One-off scripts (OG image generation, local deploy)
docs/          — Maintainer + deployment docs
public/
  _headers     — Cloudflare Pages: CORS + Accept-Ranges
  _redirects   — SPA fallback
  artifacts/   — (Symlinked) plateau-core city outputs in dev
  og/          — Generated OG previews
```

## PR conventions

- One concern per PR. Smaller is better.
- Title in imperative present tense: *"Fix landslide in_zone false negative"*,
  not *"fixed bug"*.
- If the change is visible, attach a before/after screenshot or include an
  updated OG image (`npm run og:generate`).
- Open issues for design questions before writing code; the project has a
  strong "credibility > flash" stance that may not be obvious from the code.

## Adding a city

1. Generate the city's artifacts in [`plateau-core`](../plateau-core).
2. Add an entry to `src/app/cities.ts` with `cityCode`, `slug`, label, and
   approximate center/zoom.
3. Add the slug to the OG generation list in
   `scripts/generate-og-images.ts` if it's a sample we publish.
4. (Maintainer step) upload artifacts to the R2 bucket or commit the symlink
   for dev.

## Reporting issues

Use the issue templates:
- **Bug** — something renders incorrectly, especially anything that misleads
  about hazard data.
- **Feature** — a capability the project should have. Read the "Won't do"
  list in [`docs/DESIGN.md`](./docs/DESIGN.md) first.

## Security

For security issues, do **not** open a public issue. Email
[pan@yodolabs.jp](mailto:pan@yodolabs.jp) and we'll triage privately
within a few business days.

## Maintainers

- [Yodo Labs](https://yodolabs.jp) (PixelX Inc.) — primary maintainer
- Public discussion: GitHub issues and PRs on this repo

## License

By contributing, you agree your contributions will be licensed under the
project's MIT license.
