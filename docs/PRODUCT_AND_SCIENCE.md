# Product and Science

## Problem

"Mars-like" is not a test specification. Science and engineering teams need to know which terrestrial site reproduces conditions relevant to a specific activity, with what evidence, what uncertainty, and what must be validated in the field.

## Proposal

AnalogOS prioritizes terrestrial zones for a Mars rover mobility, navigation, and autonomy test. It turns planetary and satellite data into an auditable shortlist. It has a global view and a pilot run in two regions of Chile and Argentina; territorial restrictions are still pending an official cross-check.

## Primary User

The person responsible for planning a test campaign who must choose where to carry out reconnaissance without mistaking a geospatial shortlist for authorization, safety, or definitive suitability.

## P0 Flow

1. View the profile `mars-rover-screening-v3` and its limits (same v2 formulas and weights).
2. Understand the sweep of 50 windows and explore six candidates, filtering by Chile or Argentina. Yungay is kept separately as a known reference.
3. Review similarity, confidence, and feasibility separately.
4. Open the breakdown by criterion and its sources.
5. Compare candidates and reference, preserving their roles and background.
6. Understand where the analogy fails.
7. Export a sheet with field verifications.

## P0 Scientific Profile

The profile attempts to represent conditions relevant to perception, traction, navigation, and autonomy:

- slope;
- roughness and relief variability;
- fraction of exposed soil;
- low vegetation cover;
- aridity as context;
- surface thermal variability, if a defensible product exists;
- simplified and traceable geological class;
- sufficient spatial continuity.

The Martian reference is derived from PDS/MOLA. Terrestrial variables must document product, period, resolution, CRS, units, and transformations.

## What It Does Represent

- terrain and obstacles at the available scale;
- surface exposure;
- isolation and some operational challenges;
- terrestrial environmental conditions that serve as a test proxy.

## What It Does Not Represent

- Martian gravity;
- atmosphere or pressure;
- space radiation;
- exact regolith chemistry;
- complete Martian temperature;
- permits, safety, or official suitability.

## Independent Outputs

### Similarity

Physical fit to the test profile. Range 0–100.

### Confidence

Quality and sufficiency of the evidence. Range 0–100. It must decrease due to NoData, inadequate resolution, age, excessive transformations, or inconsistencies.

### Feasibility

Preliminary classification, never a promise: `unknown`, `requires_review`, `potentially_feasible`, `excluded`.

### Stability

Indicator 0–100 calculated as `100 − worst absolute score change` by perturbing each weight individually by ±20 % and renormalizing. It does not represent total uncertainty or scientific validation.

## Minimum Result per Candidate

- generalized polygon;
- approximate area;
- similarity and breakdown;
- confidence and missing data;
- preliminary feasibility and warnings;
- what is analogous;
- where it fails;
- what test it is useful for;
- what to verify in the field;
- evidence and sources.

## Novelty criterion

Atacama is a benchmark. A "new" candidate must be outside the list of obvious analogs or provide a non-trivial characterization/test use. Novelty is explained; it is not forced through the score.

## Product message

AnalogOS does not say "this place is Mars". It says "this place deserves to be investigated for this test, for these reasons, with these limitations".

## Chile–Argentina pilot (v3)

Since the v3 snapshot, the visible brand is **AnalogOS** and the product searches instead of listing. The vision is global; what has been executed is a limited pilot.

- **What it does:** it scans a grid of 50 windows of ~20 km in two test regions, ranks them by topographic priority, excludes those that contain published sampling coordinates, and characterizes up to six with all sources.
- **Roles:** each site is `candidate` (it leaves the search) or `reference` (known analog, outside the ranking). Yungay is the reference.
- **Novelty:** the criterion is no longer "find a new site". The system records prior work and never declares a window to be new; the literature review status is kept separate from the role.
- **What it does not represent:** a national or global search, free or suitable terrain, or a quality comparison between a candidate and a site with decades of fieldwork.

Decision in `docs/decisions/ADR-008-global-discovery-pilot.md`; results in `docs/DISCOVERY_REPORT.md`.

## Test planner (M8)

User: person responsible for a planetary robotics campaign. Decision: "for this trial, which sector deserves reconnaissance, why, what rules it out, and what remains to be measured?".

- **Define a test**: optional text + editable requirements (regional median slope, roughness, relief, non-vegetated fraction, polygon area, country) or requests without measurement (traction, rock size, permits, cost, local rainfall, mobile coverage, point slope…). The user confirms and only then is the evaluation run.
- **Evaluate a sector**: one of the seven areas with evidence, a point, or a rectangle. A point only suggests the window that contains it; a rectangle that differs from the window, or lies outside the windows, produces an insufficient-evidence report with the exportable request. There is no nearest neighbor and no new acquisition.
- **Result**: prioritized for reconnaissance, does not meet requirements, insufficient evidence, or unsupported objective; per requirement, observed value, scale, period and evidence. Similarity, confidence and stability are those of the v3 snapshot, without recalculation; territorial feasibility remains pending. It is valid for no area to be prioritized. Yungay appears as a known reference.
- **What it does not say**: it does not approve, authorize or guarantee safety; the area is the extent of the polygon, not free surface; SCL does not prove traction; POWER does not approve local rainfall. The requirements are conditions of the user's trial, not NASA standards.
- **First supported profile**: Mars rover with Jezero reference. "Other objective" keeps the request without calculating or recommending.
