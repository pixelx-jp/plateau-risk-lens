## Summary

<!-- What does this PR change, and why? Link any issues. -->

## Honesty checklist

If this PR touches rendering, classification, or exports:

- [ ] `covered=false` still renders grey + hatch (no green pixels)
- [ ] `coverage_confidence="unknown"` still renders light grey (not green)
- [ ] `*_coverage_source_ids` and `*_hit_source_ids` remain separately labelled in the property card and export metadata
- [ ] Any missing field (`null`/empty) renders as `—`, not `0`
- [ ] Disclaimer + attribution + dataset year remain on every screenshot and GeoJSON export

## Tests

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:e2e` (especially `no-green-on-nodata.spec.ts` if paint changed)

## Screenshots

<!-- For visible changes, attach before/after. -->
