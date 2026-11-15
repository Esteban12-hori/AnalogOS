# Results and correct interpretation

## Pilot search (`science-screening-v3`)

| Stage | Result |
|---|---|
| Test regions | Interior of Antofagasta (Chile) and Puna of Catamarca and Salta (Argentina) |
| 0.2° windows evaluated | 50 of 50 (≈ 22,274 km²) |
| Excluded for containing published sampling coordinates | 4 |
| Discarded for proximity to a better window | 2 |
| Shortlisted and characterized with all sources | 6 (3 per country) |

## Candidate ranking

| Rank | Candidate | Similarity | Confidence | Stability | Status |
|---:|---|---:|---:|---:|---|
| 1 | Interior of Antofagasta · 25.0° S, 69.7° W | 94.87 | 77.45 | 99.33 | requires review |
| 2 | Interior of Antofagasta · 24.8° S, 69.5° W | 91.87 | 77.45 | 99.03 | requires review |
| 3 | Interior of Antofagasta · 25.2° S, 69.5° W | 90.35 | 77.36 | 99.08 | requires review |
| 4 | Puna of Catamarca and Salta · 26.2° S, 67.5° W | 63.85 | 77.00 | 95.88 | requires review |
| 5 | Puna of Catamarca and Salta · 26.4° S, 67.3° W | 53.68 | 77.25 | 96.81 | requires review |
| 6 | Puna of Catamarca and Salta · 25.8° S, 67.1° W | 49.43 | 77.40 | 96.81 | requires review |

Known reference, outside the ranking: Pampa Yungay, 75.67 / 77.45 / 99,03, identical to the v2 snapshot.

Stability measures only the worst change in the score when perturbing one weight at a time by ±20 %. It does not cover data uncertainty, alternative profiles or simultaneous perturbations.

## Why the order is what it is

| Variable | MOLA Jezero | Candidate 1 (Chile) | Candidate 4 (Argentina) | Yungay (reference) |
|---|---:|---:|---:|---:|
| Median slope | 2.226° | 2.169° | 2.568° | 3.207° |
| Median neighboring difference | 11.0 m | 11.291 m | 12.654 m | 16.564 m |
| Median local relief 3×3 | 47.0 m | 46.797 m | 55.867 m | 75.125 m |
| Non-vegetated surface | terrestrial requirement | 100.0 % | 99.4 % | 100.0 % |
| Context precipitation (POWER) | not applicable | 10.96 mm/year | 588.05 mm/year | 7.30 mm/year |

- The Chilean candidates outrank Yungay because their topography at ~480 m resembles that of the Jezero surroundings more closely.
- The best Argentine candidate has topography comparable to that of the Chilean ones, but the POWER climate context assigns it 588 mm/year. That value comes from a MERRA-2 cell of 0.5° × 0.625°, larger than the window: it is not rainfall measured at the site and requires local verification. No weights or values were adjusted to compensate for it.
- Two Chilean candidates have coinciding POWER values: a possible shared cell, not independent observations.

## What the result does not demonstrate

- There are no newly confirmed analogs. Both regions have published precedents and the reviewed catalog is incomplete.
- It does not demonstrate that any candidate is a better site than Yungay, which has two decades of fieldwork.
- It does not evaluate obstacles, grain size distribution or traction at wheel scale.
- It does not reproduce Martian gravity, atmosphere, pressure, radiation or chemistry.
- It does not evaluate ownership, permits, access, safety or environmental impact in either country.
- It does not complete geological relevance or soil composition or mechanics.
- A window of ~440 km² is not entirely free of obstructions or suitable: the images show linear traces and structures that must be checked against official cartography.
- It is not a national or global search: it covers two test regions.

The details of each window, the precedents and the literature searches are in `docs/DISCOVERY_REPORT.md`. The historical ranking of the v2 snapshot (Yungay, Domeyko, María Elena) is preserved in `artifacts/science-v2/`.
