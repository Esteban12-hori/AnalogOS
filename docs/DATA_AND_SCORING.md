# Data and Scoring Model

## P0 Sources

| Need | Priority source | Use |
|---|---|---|
| Land topography | NASA Earthdata NASADEM_HGT.001 | elevation, slope, roughness, local relief and water mask |
| Surface | Copernicus Sentinel-2 L2A | SCL class 5, NDVI, BSI, vegetation and monthly water |
| Availability validation | NASA HLS S30 v2.0 / CMR | independent inventory; does not enter the v2/v3 score |
| Regional climate | NASA POWER | aridity and context; not local precision |
| Surface temperature | MODIS LST | optional if the period and quality are defensible |
| Geology | SERNAGEOMIN via MMA (Chile, 1:1,000,000) / SEGEMAR-SIGAM (Argentina, 1:250,000) | **descriptive context** per sector (sheet and export, `docs/GEOLOGY_CONTEXT.md`); the score criterion remains uncalibrated and does not score |
| Restrictions | IDE Chile / IDERA (Argentina) | official cross-check pending; neither permission nor absence of restrictions is inferred |
| Mars | NASA PDS MOLA | planetary topographic signature |

## Mandatory Manifest

Each dataset must record:

- provider and product;
- landing and access URL;
- collection/version;
- download date;
- time period;
- spatial and temporal resolution;
- CRS and units;
- license/attribution;
- checksum;
- NoData values and quality flags;
- transformations;
- known limitations.

## Unit of Analysis

- National screening: approximate grid of 5 km or the coarsest one that allows completion.
- Refinement: top 3–5 regions with 30–250 m products depending on availability.
- Do not interpolate a coarse climate source to claim local differences.
- Areas and distances are computed in an appropriate projection, not in degrees.

## Implemented v2 Cut

- NASADEM is mosaicked before clipping; Yungay requires four tiles.
- The topographic comparison keeps 16×16 blocks (~473–476 m).
- Sentinel-2 uses 12 monthly mosaics from 2025 at ~30 m, order `leastCC` and `maxCloudCoverage=40`.
- SCL classes 2, 4, 5 and 6. are valid. Clouds, cirrus, shadows, saturated, unclassified, snow and NoData are masked.
- The non-vegetated fraction is the spatial mean of SCL 5 per month and then the median of the 12 months.
- Its maximum quality is 0.90 and decreases with missing coverage or intervals.
- HLS is queried to demonstrate independent NASA availability, but its pixels are not averaged with Sentinel-2.

## Function per Criterion

Each criterion produces `s_i` between 0 and 1 and must declare the method:

- ideal range with tolerances;
- distance to a reference distribution;
- categorical compatibility;
- hard constraint.

Invented ranges are not allowed. A variable without calibration stays with `status: needs_calibration` and out of the final score until approved.

## Aggregate Similarity

```text
S = 100 × exp(Σ w_i × ln(max(s_i, ε)))
```

- `w_i ≥ 0` and the sum is 1.
- `ε = 0.01` by default and must be versioned.
- It is computed only with enabled and calibrated criteria.
- If the available valid weight is less than `0.70`, the candidate is left `insufficient_data`.
- If there are missing criteria but 0.70, is exceeded, the available weights are renormalized and the confidence receives the penalty.

## Confidence

```text
C = 100 × Σ w_i × q_i
```

`q_i` combines, with explicit rules:

- valid coverage;
- resolution adequacy;
- recency/period;
- provider quality;
- consistency between sources;
- transformation complexity.

Missing data does not automatically equal zero similarity.

## Constraints

A constraint has an authority, a source and an action:

- `exclude`: cannot be a candidate;
- `warn`: remains with a warning;
- `review`: requires human review.

P0 considers at least water bodies, urban areas, minimum area, incompatible slope and sensitive areas when a defensible source exists.

## Candidates

1. Apply constraints.
2. Compute similarity and confidence.
3. Select cells above the versioned threshold.
4. Group contiguous cells.
5. Remove areas that are too small.
6. Generalize geometry for the actual scale.
7. Compute polygon statistics.
8. Rank and retain exclusion reasons.

## Sensitivity

Perturb weights by ±20 %, renormalize and record:

- frequency in the top 3;
- average change in position;
- criterion responsible for the greatest instability.

## Minimum tests

- weights sum to 1;
- known score for a synthetic case;
- epsilon avoids the logarithm of zero;
- a very low criterion penalizes the geometric mean;
- missing data reduce confidence;
- valid weight below 0.70 produces `insufficient_data`;
- ranking is stable in case of ties;
- constraints exclude with a traceable reason;
- score and confidence are not mixed.

## Implemented v3 cut

- Configuration: `config/discovery_search_v3.json` (regions, thresholds, limits) and `config/analog_precedents_v1.json` (background records).
- Stage 1 (`pipelines.discover_candidates`): NASADEM metrics for 50 windows with the v2 code; rejection due to coverage < 95 %, water > 5 %, data failure or published coordinates; topographic priority with relative weights 0.20/0.20/0.15; up to 3 windows per country with centers at ≥ 25 km.
- Stage 2 (`pipelines.fetch_discovery_data --stage sources` and `pipelines.build_discovery_snapshot`): Sentinel-2, POWER and HLS inventory only for the preselection; same formulas, weights and minimum of 0.70 valid weight.
- Topographic priority is neither a score nor a confidence and does not relax the minimum of the multi-source score.
- Quality: Sentinel-2 completeness against the 12 configured months; topographic quality × valid NASADEM coverage; POWER validated against units, fill values and ranges. None of these changes alter the v2 values.
- Cache: each raw data item stores the fingerprint of its request (bbox, period, product, transformation). The build fails if a data item belongs to another request.
- Contracts: `candidate-site` supports `cl-`/`ar-` and requires in v3 `country`, `role`, `discovery` and `literature_review`; new `discovery-search` and `precedent-catalog`.
- A search without preselection produces a snapshot with only the reference and without stage 2. datasets
