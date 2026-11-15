# Reproducible methodology

## Profile

P0 objective: prioritize sectors for investigating terrestrial tests of perception, traction, navigation, and rover autonomy. The output does not evaluate a permanent base site and does not authorize a campaign.

## Planetary reference

- Product: MGS MOLA MEGDR `MEGT44N000HB`.
- File: 128 pixels/degree, big-endian integers of 16 bits.
- Window: center 18.38° N, 77.58° E; 1.6° × 1.6° around the regional environment of Jezero.
- Nominal scale used: ~451 m average between the latitudinal and longitudinal cell size.

Derived metrics:

- median slope: 2.226°;
- median absolute difference between neighboring cells: 11.0 m;
- median local relief in a 3×3: window 47.0 m.

## Terrestrial terrain v2

- Product: NASADEM_HGT.001 from NASA LP DAAC, downloaded with Earthdata Login.
- Windows: 0.2° × 0.2° centered on each sector.
- Transformation: mosaic of all intersected tiles, cropping, and 16×16 block averaging before deriving metrics.
- Resulting analysis scale: ~473–476 m depending on latitude.

Yungay crosses four tiles. Mosaicking before cropping corrects the edge truncation present in v1. The NASADEM SWB mask is used for permanent water screening.

The similarity of each topographic variable is the ratio between the smaller and the larger of the Earth/Mars values:

```text
s = min(valor_tierra, valor_marte) / max(valor_tierra, valor_marte)
```

This yields 1 when the metrics match and decreases symmetrically for larger or smaller values. It is a screening metric, not a physical error distribution.

## Sentinel-2 surface

- Product: Copernicus Sentinel-2 L2A via the Statistical API.
- Period: twelve monthly intervals, January–December 2025.
- Requested resolution: 0.0003° (~30 m nominal).
- Mosaic: lowest cloudiness, with a maximum of 40 % cloud per scene.
- Valid mask: SCL 2, 4, 5 and 6; NoData, saturated, shadow, clouds, cirrus, unclassified, and snow are excluded.

The non-vegetated fraction is the spatial mean of SCL class 5 per month and then the temporal median. Its similarity is that same fraction because the test profile requires continuity of exposed surface; it is not presented as a mineralogical analogy with Mars. NDVI and BSI are also retained for auditing.

NASA HLS S30 v2.0 is queried via CMR as an independent inventory. Its pixels do not enter the score, to avoid double counting Sentinel-2. observations

## Climate context

NASA POWER Climatology Point API, 2001–2025:

- approximate annual precipitation = `PRECTOTCORR.ANN × 365,25`;
- surface thermal range = `TS_MAX.ANN − TS_MIN.ANN`.

Precipitation uses a decreasing preference with a scale of 25 mm/year:

```text
s_aridity = 1 / (1 + annual_precipitation / 25)
```

The thermal range saturates at 45 °C:

```text
s_thermal = min(thermal_range / 45, 1)
```

Both are versioned engineering requirements, not full climate equivalences with Mars. POWER represents the nearest regional cell, not a local station.

## Aggregation

For valid criteria:

```text
S = 100 × exp(Σ w′ᵢ × ln(max(sᵢ, 0,01)))
```

Valid weights are renormalized. If they sum to less than 0,70,, no similarity is published. In v2 the valid weight is 0.90; only geology remains outside the score.

Confidence:

```text
C = 100 × Σ wᵢ × qᵢ
```

Missing data contribute zero quality. Confidence and similarity are never combined.

The `qᵢ` qualities are values assigned by source type (ADR-003), not measured uncertainties. For that reason, confidence barely distinguishes among the three sectors (77.41–77.45): it indicates how much evidence entered the score, not which sector is better measured.

In the profile, `validated` means "approved for screening by ADR-002 and ADR-003"; there was no external expert or field validation. The `method: reference_distribution_distance` field is implemented in v2 as the ratio of medians described above, not as a distance between full distributions.

## Feasibility

Each constraint declares authority, source, action, and reason. In v2, permanent water screening is completed with NASADEM SWB and Sentinel-2. Protected areas, urban areas, access, ownership, and wheel-scale hazards remain pending; therefore all candidates remain `requires_review`.

## Sensitivity

Each weight is individually perturbed by −20 % and +20 %, renormalizing the set. The published stability is `100 − worst absolute score change`. It does not measure raster uncertainty, profile selection, or joint sensitivity.

## Reproducibility

```bash
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot
npm run verify
```

The manifest stores provider, product, version, URL, date, period, resolution, CRS, units, license, NoData, transformations, and SHA-256 checksum. Credentials and tokens are deliberately omitted.

## v3 Pilot Search

The above describes the formulas, which do not change. The `science-screening-v3` snapshot applies them to a search instead of to sectors chosen in advance.

1. **Grid.** Two test regions of 1° × 1° (interior of Antofagasta and Puna of Catamarca and Salta) divided into 25 windows of 0.2° each: 50 windows of 442–449 km², with identifiers derived from the center. They are a test selection, not a representative sample.
2. **Topographic priority.** For each window, slope, roughness, and relief are computed with aggregated NASADEM, and windows are ranked by the geometric mean of their three similarities with relative weights 0.20/0.20/0,15. It only ranks the shortlist: it is not the score or the confidence.
3. **Recorded rejections.** NASADEM coverage < 95 %, permanent water > 5 %, data failure, or presence of published sampling coordinates within the window. Each window stores its reason.
4. **Diversification.** Up to three windows per country, with centers separated by at least 25 km and ties broken by identifier. The list is not completed by hand.
5. **Characterization.** Only the shortlist receives monthly Sentinel-2, POWER, and HLS inventory, and it is scored with the same formulas and weights.
6. **Reference.** Yungay is recalculated with its v2 data and the same rules; it retains 75.67 / 77.45 / 99.03 and is left out of the ranking.

Corrections to avoid generating false confidence, without changing the v2 values:

- Sentinel-2 completeness is measured against the 12 configured months, and months that are duplicated, outside the period, incomplete, in error, or with non-finite or out-of-range values are discarded;
- topographic quality is multiplied by the valid NASADEM coverage;
- POWER is validated (units, fill value, ranges) before scoring;
- each raw data item is linked to its exact request; data from a different configuration stops the build.

NASA POWER delivers the 2 MERRA cell of 0.5° × 0.625° that contains the point. That cell is larger than the window, so the climate context is not rainfall measured at the site, it may coincide between neighboring windows, and it needs local contrast. In the Puna it gives 562–767 mm/year and explains most of the difference among the Argentine candidates.

Prior work: a versioned catalog distinguishes “contains a published sampling coordinate,” “overlaps a study area,” “proximity (25 km heuristic to the center),” and “regional precedent.” No window is declared new, and not finding matches does not prove novelty. Details in `docs/DISCOVERY_REPORT.md`.

```bash
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_discovery_snapshot
npm run verify
```
