# AnalogOS Chile

## Short description

AnalogOS Chile is an explainable geospatial decision system that prioritizes terrestrial sectors for investigating Mars rover mobility, perception, navigation, and autonomy tests. It compares Martian and Chilean topography at a similar spatial scale, adds climate context, and keeps similarity, evidence confidence, and field feasibility as separate decisions.

## The problem

Saying that a place “looks like Mars” is not a test specification. Engineering teams need to know which property is analogous, which experiment it supports, what evidence backs the claim, what is missing, and what must be verified in the field.

## Our solution

The MVP turns one mission question into a measurable profile: which Chilean sector best reproduces terrain conditions relevant to rover perception, traction, navigation, and autonomy?

AnalogOS:

1. derives a regional topographic reference around Jezero from NASA PDS MOLA;
2. downloads NASADEM through Earthdata, mosaics every intersecting tile, and aggregates terrain to a comparable scale;
3. measures non-vegetated surface, vegetation, water, NDVI, and BSI from twelve monthly Sentinel-2 L2A mosaics;
4. adds regional aridity and surface-temperature context from NASA POWER;
5. computes an explainable weighted geometric similarity;
6. displays confidence, missing evidence, weight sensitivity, and feasibility separately; and
7. exports auditable candidate records from a versioned offline snapshot.

## Preliminary result

We evaluated three 0.2° screening sectors in northern Chile. Pampa Yungay ranks first at 75.67/100, the interior Domeyko Range sector follows at 71.60, and Pampa María Elena scores 49.99. Evidence confidence is approximately 77.4/100, while all three still require field review.

Yungay does not win because of a preassigned “Mars analog” label. It combines NASADEM terrain comparable to the regional Jezero MOLA window, 100% non-vegetated surface in the monthly Sentinel-2 median, and hyper-arid context.

## What is innovative

- Earth and Mars are compared at similar spatial scales, avoiding false precision.
- Similarity, evidence quality, and operational feasibility are deliberately separated.
- Missing evidence lowers confidence without being treated as physical dissimilarity.
- Every source keeps its URL, version, period, resolution, units, transformations, and SHA-256 checksum.
- AI does not decide the ranking; scoring is deterministic and auditable.

## NASA data

- Mars Global Surveyor MOLA MEGDR from the NASA Planetary Data System.
- NASADEM_HGT.001, accessed with NASA Earthdata Login.
- HLS Sentinel-2 v2.0 metadata through CMR as an independent availability inventory.
- NASA POWER Climatology API for 2001–2025.

Partner data: Copernicus Sentinel-2 L2A through the Statistical API.

## Limitations and next steps

This is desktop screening, not site approval. It does not reproduce Martian gravity, atmosphere, radiation, or soil mechanics, and the ~460–480 m topographic comparison cannot detect wheel-scale hazards. Permanent water is now screened, while geology, protected areas, urban infrastructure, ownership, and access remain pending.

Next, we will add SERNAGEOMIN geology, official Chilean restriction layers, Worldview inspection, and field validation, then expand from three seeded sectors to a national grid.

## Technology

Python, earthaccess, Sentinel Hub Statistical API, NumPy, PyProj, JSON Schema, React, TypeScript, Vite, and SVG. The final app is static, keyboard accessible, and requires no external service during the demo.
