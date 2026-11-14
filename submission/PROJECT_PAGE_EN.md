# AnalogOS

Planetary analog exploration · Chile–Argentina pilot

## Short description

AnalogOS is an explainable geospatial decision system that searches for and prioritizes terrestrial sectors worth investigating for Mars rover mobility, perception, navigation and autonomy tests. It combines Mars and Earth topography at a comparable scale, satellite-observed surface, climate context and published precedents, and keeps similarity, confidence and feasibility as separate decisions. The vision is global; what has been executed is a bounded pilot in Chile and Argentina.

## The problem

Saying a place “looks like Mars” is not enough to plan a test. A team needs to know which property is analogous, which experiment it serves, what evidence supports it, what data is missing and what must be verified in the field. Pointing at famous analogs does not demonstrate search capability either: Yungay, in the Atacama, has been studied for more than twenty years.

## Our solution

AnalogOS turns a mission question into a measurable profile and applies it to a documented search. For the pilot we ask: which sector best reproduces conditions relevant to testing rover perception, traction, navigation and autonomy?

The system:

1. Derives a regional topographic reference around Jezero from NASA PDS MOLA.
2. Walks a regular grid of ~20 km windows across two test regions and computes NASADEM topography for each at the same scale as MOLA.
3. Records why each window is rejected, discarded or shortlisted; it never completes the list by hand.
4. Checks every window against a catalog of precedents: a window containing published sampling coordinates leaves the ranking and stays visible as a precedent.
5. Characterizes the shortlist with twelve monthly Sentinel-2 L2A mosaics and NASA POWER climate context.
6. Computes an explainable similarity with a weighted geometric mean and shows confidence, missing data, stability and feasibility without mixing them.
7. Shows a real satellite image per site, exports an auditable record and runs offline from a versioned snapshot.

## Preliminary result

The pilot evaluated 50 windows (about 22,000 km²) in the interior of Antofagasta, Chile, and the Puna of Catamarca and Salta, Argentina. Four Chilean windows were excluded because they contain already published sampling coordinates. Six were shortlisted, three per country:

| Candidate | Similarity | Confidence |
|---|---:|---:|
| Antofagasta interior · 25.0° S, 69.7° W | 94.87 | 77.45 |
| Antofagasta interior · 24.8° S, 69.5° W | 91.87 | 77.45 |
| Antofagasta interior · 25.2° S, 69.5° W | 90.35 | 77.36 |
| Puna of Catamarca and Salta · 26.2° S, 67.5° W | 63.85 | 77.00 |
| Puna of Catamarca and Salta · 26.4° S, 67.3° W | 53.68 | 77.25 |
| Puna of Catamarca and Salta · 25.8° S, 67.1° W | 49.43 | 77.40 |

Yungay was recomputed with the same rules as a known reference (75.67) and stays out of the ranking.

What this result does not say: no candidate is a confirmed new analog. Both regions have published precedents, every site requires review, and the images show tracks and structures that must be checked against official mapping. The Argentine candidates score lower mainly because of coarse-resolution climate context, not a local measurement.

## Innovation

- It searches instead of listing: an algorithmically derived grid, a versioned shortlisting rule and a record of every discard.
- It separates the role of a site (candidate or reference) from the state of its literature review, and never hides a precedent.
- It compares Earth and Mars at a similar spatial scale, avoiding the false detail of matching 30 m against hundreds of meters.
- It separates similarity, evidence quality and operational feasibility.
- It never turns failures into data: incomplete months, fill values or requests from another configuration stay missing or stop the process.
- No AI decides the ranking; the score is deterministic and auditable.

## NASA data used

- Mars Global Surveyor MOLA MEGDR, NASA Planetary Data System.
- NASADEM_HGT.001 through NASA Earthdata Login.
- HLS Sentinel-2 v2.0 through CMR, used as an independent inventory.
- NASA POWER Climatology API, 2001–2025.

Associated data: Copernicus Sentinel-2 L2A through the Statistical and Process APIs; Natural Earth outlines.

## Limitations and next steps

This is a desktop screening, not an official selection. It does not represent Martian gravity, atmosphere, radiation or soil mechanics; the ~460–480 m topographic comparison cannot see wheel-scale obstacles. Geology, protected areas, urban land, ownership and access remain pending in both countries. NASA POWER describes a 0.5° × 0.625° cell, larger than each window. The precedent catalog is incomplete.

Next steps: cross the candidates with official IDE Chile and IDERA layers, add SERNAGEOMIN and SEGEMAR geology, check the climate against local data, complete the literature review and extend the search to more regions.

## Impact

The approach narrows the search space and makes early planning defensible for robotic campaigns, education, geological research and autonomous-system testing. The same engine supports other regions and profiles without changing the data contract or the decision interface.

## Technologies

Python, earthaccess, Sentinel Hub Statistical and Process APIs, NumPy, PyProj, JSON Schema, React, TypeScript, Vite and SVG. The frontend is static, keyboard-accessible and does not depend on external services during the demo.
