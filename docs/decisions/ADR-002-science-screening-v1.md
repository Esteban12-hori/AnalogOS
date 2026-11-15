# ADR-002 — Preliminary MOLA + SRTM + POWER Scientific Snapshot

- Status: accepted for the hackathon delivery
- Date: 2026-11-14

## Context

The product needed to replace fixtures with a reproducible result without depending on Earthdata or Copernicus credentials. Directly comparing SRTM at ~30 m with MOLA at hundreds of meters would introduce an unacceptable scale difference.

## Decision

1. Use MOLA MEGDR `MEGT44N000HB` at 128 pixels/degree as the reference for the regional environment of Jezero.
2. Aggregate SRTM 1 arc-second in 16×16 blocks before calculating slope, difference between cells, and 3×3. relief. The resulting scale is ~473–476 m, close to the ~451 m nominal scale of the MOLA window used.
3. Use NASA POWER 2001–2025 only as regional context for precipitation and skin temperature range.
4. Keep exposed soil and geology out of the v1 score; their missing weight reduces confidence.
5. Mark water, urban areas, sensitive areas, access, and field slope as not evaluated, forcing `requires_review`.

## Interpretation

The output prioritizes sectors to investigate. It does not demonstrate equivalence with Mars, wheel-scale traversability, safety, permission, or legal feasibility.

## Consequences

- The valid weight is exactly 0,70 and the confidence remains at 57,8/100.
- There are three real candidates and no fixture appears in the final view.
- The next version must add optical classification, SERNAGEOMIN geology, and official restriction layers.
