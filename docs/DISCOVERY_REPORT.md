# Search and background report — Chile–Argentina pilot (v3)

This report makes it possible to reconstruct why each window was evaluated, discarded, or selected. The complete data are in `artifacts/science-v3/search-results.json`; the catalog of background sources is in `config/analog_precedents_v1.json`.

## Summary

| Stage | Result |
|---|---|
| Windows attempted / with valid metrics | 50 / 50 |
| Area explored | ≈ 22,274 km² (25 windows of 442–449 km² per region) |
| Rejected due to coverage or water | 0 |
| Excluded for containing published sampling coordinates | 4 (all in Chile) |
| Discarded for proximity to a better window | 2 |
| Eligible but outside the quota of 3 per country | 38 |
| Shortlisted and characterized with all sources | 6 (3 per country) |
| API failures or rejected months in stage 2 | 0 |

This is a limited experiment in two test regions. It is not a national or global search and does not declare any window to be new.

## Reproduction

```bash
source .venv/bin/activate
python -m pipelines.fetch_discovery_data --stage tiles     # missing NASADEM tiles (Earthdata)
python -m pipelines.discover_candidates                    # stage 1: 50 windows and preselection
python -m pipelines.fetch_discovery_data --stage sources   # Sentinel-2, POWER and HLS from the preselection
python -m pipelines.build_context_outline                  # Natural Earth outlines of both countries
python -m pipelines.build_discovery_snapshot               # snapshot v3 completo
python -m pipelines.fetch_visual_context --snapshot v3     # images; reuses the local package without network access
```

The download stages use credentials from the environment or `.env` and only against official hosts. Everything already obtained is reused; the cache is tied to the exact request (bbox, period, product, and transformation).

## Result by country

Similarity, confidence, and stability using the v2 formulas and weights. All remain "requires review".

| Role | Window | Topographic priority | Similarity | Confidence | Stability |
|---|---|---:|---:|---:|---:|
| Candidate | `cl-win-s2500-w06970` · 25.0° S, 69.7° W | 98.01 | 94.87 | 77.45 | 99.33 |
| Candidate | `cl-win-s2480-w06950` · 24.8° S, 69.5° W | 96.16 | 91.87 | 77.45 | 99.03 |
| Candidate | `cl-win-s2520-w06950` · 25.2° S, 69.5° W | 93.58 | 90.35 | 77.36 | 99.08 |
| Candidate | `ar-win-s2620-w06750` · 26.2° S, 67.5° W | 86.07 | 63.85 | 77.00 | 95.88 |
| Candidate | `ar-win-s2640-w06730` · 26.4° S, 67.3° W | 64.53 | 53.68 | 77.25 | 96.81 |
| Candidate | `ar-win-s2580-w06710` · 25.8° S, 67.1° W | 59.26 | 49.43 | 77.40 | 96.81 |
| Reference | `cl-pampa-yungay-screening` (outside the ranking) | 66.40 | 75.67 | 77.45 | 99.03 |

Correct reading:

- The Chilean candidates score higher than Yungay because their topography at ~480 m is more similar to that of the Jezero surroundings. That does not make them better sites: Yungay has two decades of fieldwork, while they have no verification at all.
- The Argentine ones score lower mainly because of the climatic context: POWER gives 562–767 mm/year. That value comes from a MERRA-2 cell of 0.5° × 0.625°, larger than the window; it is not rainfall measured at the site and needs local verification. No weights or values were adjusted.
- Two Chilean candidates (24.8° S and 25.2° S) have matching POWER values: a possible shared cell, not independent observations.
- Confidence barely distinguishes between sites because it uses qualities assigned by source type.

## Windows excluded due to background sources

| Window | Topographic priority | Published coordinates it contains |
|---|---:|---|
| `cl-win-s2500-w06990` | 97.15 | AT02-26, AT02-27 |
| `cl-win-s2480-w06970` | 96.45 | AT02-28 |
| `cl-win-s2540-w06990` | 90.49 | AT01-16 / AT02-16 |
| `cl-win-s2460-w06970` | 50.14 | AT02-29 |

They are kept as evaluated and visible on the map; they are not hidden in order to feign discoveries. Two other windows (`cl-win-s2520-w06970` and `ar-win-s2600-w06750`) were left out because they are less than 25 km from a selected window with higher priority.

## Background sources reviewed

Documentary review of 2026-11-14, without expert validation. Coordinates only where the source prints them.

| Background source | What it contributes | Spatial precision |
|---|---|---|
| Navarro-González et al. (2003), Science 302, supplementary material | 30 sampling sites along a north–south transect centered at ~70° W between 24° S and 28° S; 17 fall within the Yungay window and 5 in the Chilean search region | Coordinates to the arc second; the study area is a transect, not a point |
| NASA Astrobiology (2005), "Dry Signs of Life" | Tests of the Hyperion (2003) and Zoë (2004) rovers in the Atacama | No coordinates in the source |
| NASA Astrobiology (2017), ARADS campaign | Life-detection drill at Yungay Station | Place name |
| Azua-Bustos et al. (2015), María Elena South | Site drier than Yungay with viable bacteria | Place name; outside the search regions |
| UNCA (2025) and CONICET thesis (2021) | The Catamarca Puna as an analog: Campo de Piedra Pómez, Dunas Blancas, megaripples, Carachi Pampa volcano, surroundings of Antofagasta de la Sierra | Place names without coordinates |
| EPSC abstracts 2022 (Laguna Negra, Laguna de Alumbrea) | High-altitude Andean lakes as analogs for astrobiology | Place names; position relative to the windows not verified |

Relationship to the six candidates:

- The three Chilean ones are in a region with background sources (transect and rover tests). One (`cl-win-s2500-w06970`) has a published coordinate 20.4 km from its center; that proximity is a heuristic, not the boundary of the study.
- The three Argentine ones are in the Catamarca Puna, described as an analog in the sources reviewed. No coordinates were assigned to the place names, so it is not known whether any window contains one of those sites.
- Status of the six: `regional_precedent`. None is `no_match_in_reviewed_sources`.

## Targeted searches

| Scope | Finding |
|---|---|
| Puna megaripples near the Argentine windows | There is peer-reviewed literature (de Silva et al. 2013; Bridges et al. 2015; a 2020 study in Icarus on Campo de Piedra Pómez; Zimbelman et al. 2023). No coordinates were obtained; the full texts remain unreviewed |
| High-altitude lakes and astrobiology | Studies of extremophiles in Laguna Diamante (Galán caldera) and EPSC abstracts 2022. No reviewed source makes it possible to locate those lakes within a window |
| Analog sites with coordinates near the Chilean windows | No source with coordinates within the three windows appeared; general background on the desert did (ARADS, Red Stone, Life in the Atacama) |

What is missing: reading the full texts of the Puna literature, cross-checking the Argentine place names against official cartography, and reviewing the 2010 article in JGR that Codex flagged, which could not be opened.

## Preliminary visual observations

Made by Codex and Claude on the Sentinel-2 mosaics of December 2025 (`artifacts/visual-context-v3/`). They describe appearance: they do not identify facilities, owners or permits, do not change any score and do not produce exclusions.

| Window | Observation |
|---|---|
| `cl-win-s2500-w06970` | Numerous linear traces and a light-toned, sinuous, branching network in the northeast |
| `cl-win-s2480-w06950` | Terrain with fans, a wide, sinuous light band crossing the window, and linear traces |
| `cl-win-s2520-w06950` | Rectilinear traces and light-toned geometric concentrations in the north |
| `ar-win-s2620-w06750` | Dark fields in the center and east and a green or dark strip on the northeast edge |
| `ar-win-s2640-w06730` | Dense concentration of light-toned structures in the south with an adjacent green or dark strip, consistent with human intervention to be verified |
| `ar-win-s2580-w06710` | Branching green or dark strips in the north and west |

A window of ~440 km² is not entirely free or suitable land. All of them need cross-referencing with official territorial layers.

## Unversioned raw data

In `data/raw/` (ignored by Git): seven new NASADEM tiles (~102 MB), `copernicus/sentinel2_stats_2025_v3.json`, `power/climatology_points_v3.json`, `earthdata/cmr_inventory_v3.json`, `discovery/acquisition_v3.json` (actual acquisition times) and `naturalearth/world-atlas-2.0.2-countries-50m.json`. The v3 manifest stores their checksums and times.
