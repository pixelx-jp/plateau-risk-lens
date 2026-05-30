# Hazard & attribute coverage by city

Per-city coverage of the five hazard layers and key building attributes,
read straight from each city's published `manifest.json` (`coverage_stats`
and `field_coverage`). This is the ground truth behind what the app can and
cannot color — and behind which hazard toggles it disables.

- A `—` means **zero surveyed buildings** for that hazard in that city. The
  UI **disables** that hazard's toggle (greyed + "No survey data" tooltip)
  because turning it on would just paint the whole map no-data grey.
- A percentage is the share of the city's buildings the hazard survey covers
  (`covered_count / n_buildings`). Covered ≠ at-risk: a covered building may
  still be outside any hazard zone (rendered green/safe).
- `< 1% (n)` flags layers with only a handful of zone hits (e.g. landslide in
  the flat central wards) — real, so the toggle stays enabled.

Source: © Project PLATEAU / 国土交通省 (MLIT), CC BY 4.0. Coverage reflects
what MLIT has surveyed and published per ward — gaps are upstream data
availability, not omissions by this tool.

| City | Code | Year | Buildings | River flood | Inland flood | Tsunami | Storm surge | Landslide | Year built | Structure |
|---|---|---|---:|---|---|---|---|---|---|---|
| Chiyoda-ku | 13101 | 2023 | 12,541 | 62% | — | — | — | <1% (66) | 0% | 0% |
| Chuo-ku | 13102 | 2023 | 16,884 | 56% | — | — | — | 99% | 0% | 0% |
| Minato-ku | 13103 | 2023 | 32,131 | 65% | — | — | — | 2% | 0% | 0% |
| Shinjuku-ku | 13104 | 2023 | 57,474 | 62% | — | — | — | <1% (200) | 0% | 0% |
| Bunkyo-ku | 13105 | 2023 | 39,542 | 55% | — | — | — | <1% (381) | 0% | 0% |
| Taito-ku | 13106 | 2024 | 41,435 | 81% | — | — | — | <1% (33) | 0% | 0% |
| Sumida-ku | 13107 | 2024 | 52,945 | 84% | — | — | — | 100% | 0% | 0% |
| Koto-ku | 13108 | 2023 | 65,401 | 74% | — | — | — | 100% | 0% | 0% |
| Shinagawa-ku | 13109 | 2024 | 68,126 | 71% | — | — | — | <1% (202) | 0% | 0% |
| Meguro-ku | 13110 | 2023 | 55,365 | 67% | — | — | — | <1% (60) | 0% | 0% |
| Ota-ku | 13111 | 2023 | 156,650 | 84% | — | — | — | <1% (371) | 0% | 0% |
| Setagaya-ku | 13112 | 2023 | 204,691 | 74% | — | — | — | <1% (207) | 0% | 0% |
| Shibuya-ku | 13113 | 2023 | 41,829 | 69% | — | — | — | <1% (36) | 0% | 0% |
| Nakano-ku | 13114 | 2023 | 73,015 | 66% | — | — | — | <1% (64) | 0% | 0% |
| Suginami-ku | 13115 | 2024 | 143,453 | 56% | — | — | — | <1% (29) | 0% | 0% |
| Toshima-ku | 13116 | 2023 | 57,788 | 57% | — | — | — | <1% (43) | 0% | 0% |
| Kita-ku | 13117 | 2023 | 73,316 | 71% | — | — | — | <1% (604) | 0% | 0% |
| Arakawa-ku | 13118 | 2023 | 44,403 | 87% | — | — | — | <1% (14) | 0% | 0% |
| Itabashi-ku | 13119 | 2023 | 106,769 | 55% | — | — | — | <1% (470) | 0% | 0% |
| Nerima-ku | 13120 | 2023 | 176,987 | 48% | — | — | — | <1% (50) | 0% | 0% |
| Adachi-ku | 13121 | 2023 | 167,100 | 97% | — | — | — | 100% | 0% | 0% |
| Katsushika-ku | 13122 | 2023 | 118,543 | 100% | — | — | — | 100% | 0% | 0% |
| Edogawa-ku | 13123 | 2023 | 145,332 | 95% | — | — | — | 100% | 0% | 0% |
| Kamakura-shi | 14204 | 2024 | 69,111 | 16% | 35% | 14% | — | 24% | 0% | 100% |

## What the gaps mean

- **River flood** is the one hazard surveyed across every published city —
  it is the app's default-on layer.
- **Inland flood, tsunami, storm surge** have *no* coverage in the 23 Tokyo
  wards in this dataset year (only Kamakura carries partial inland/tsunami).
  Their toggles are disabled for every Tokyo city.
- **Landslide** is near-total in the hilly/bayfront wards (Chuo, Sumida, Koto,
  Adachi, Katsushika, Edogawa) and a few scattered zones elsewhere.
- **Year built / structure** attributes are sparse-to-absent in many wards;
  the app shows those buildings as `unknown` rather than guessing.

## Regenerating this table

Coverage is computed by `plateau-bridge` and embedded in each bundle's
`manifest.json`. To rebuild this doc from the live artifact origin:

```sh
# for each city slug: GET $VITE_ARTIFACT_BASE_ROOT/<slug>/manifest.json
# and read .coverage_stats[].{kind,covered_count} and .field_coverage
```

Generated 2026-05-30 from https://artifacts.plateau.yodolabs.jp (dataset year per row).
