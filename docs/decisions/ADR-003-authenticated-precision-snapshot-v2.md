# ADR-003 — Authenticated Snapshot v2 with NASADEM and Sentinel-2

- Status: accepted for the hackathon submission
- Date: 2026-11-14

## Context

Snapshot v1 used a single SRTM tile per sector and did not measure exposed surface. When Earthdata Login was enabled, it was found that the Pampa Yungay window crosses four tiles; analyzing only `S25W070` truncated part of the AOI. Copernicus OAuth credentials were also enabled, which makes it possible to compute Sentinel-2 statistics without downloading full scenes.

## Decision

1. Replace SRTM via mirror with `NASADEM_HGT.001` downloaded from NASA Earthdata.
2. First build a multi-tile mosaic and then crop each 0,2° window.
3. Keep the 16×16 aggregation to compare NASADEM (~30 m) with MOLA at ~460–480 m.
4. Use the NASADEM `swb` mask for permanent water screening.
5. Query Sentinel-2 L2A through the Copernicus Statistical API in twelve monthly intervals of 2025, with a nominal resolution of ~30 m and a least-cloudy mosaic.
6. Define valid pixels with SCL 2, 4, 5 and 6; derive non-vegetated surface with SCL 5, in addition to auditable NDVI and BSI.
7. Use the monthly median of the non-vegetated fraction directly as the similarity for criterion `bare_ground_fraction`. This measures continuity of surface useful for the terrestrial test, not spectral similarity to Mars.
8. Query HLS S30 v2.0 in CMR as an independent NASA inventory. Its pixels do not enter the v2 score, to avoid double-counting Sentinel-2. observations.
9. Keep geology, urban areas, sensitive areas, ownership and access outside of any resolved claim.

## Quality and confidence

- NASADEM topography: quality 0,93 for slope and 0,91 for roughness/relief.
- Sentinel-2: surface: maximum quality 0,90, multiplied by valid coverage and temporal completeness.
- POWER retains quality 0,60 because it is regional climate context.
- Geology contributes zero quality and remains outside the score.

The resulting confidence (~77,4) is higher than v1 because surface evidence now exists, but it does not imply field validation.

## Consequences

- Yungay uses four tiles and no longer suffers from edge truncation.
- The valid weight rises from 0,70 to 0,90.
- The ranking is maintained, but the values change: Yungay 75,67; Domeyko 71,60; María Elena 49,99.
- María Elena retains a warning for ~0,15 % permanent water detected in the polygon.
- Full reproduction requires free Earthdata and Copernicus accounts; the final demo still works offline with the versioned snapshot.
