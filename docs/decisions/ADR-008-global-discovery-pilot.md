# ADR-008 — Global AnalogOS: Chile–Argentina Discovery Pilot

- Status: accepted by Codex (2026-11-14; independent review in `../CODEX_M7_REVIEW.md`)
- Date: 2026-11-14
- Numbering: initially ADR-006; renumbered to ADR-008 when integrating the remote progress, which already used ADR-006 and ADR-007 for the visual scenario. The science and the artifacts do not change.
- Authorization: Dan approved the change of scope on 2026-11-14; Codex approved the method checkpoint the same day.

## Context

Up to snapshot v2, the product evaluated three sectors chosen in advance in Chile, with Yungay in first place. Yungay has been a published analog for more than twenty years: presenting it as a result does not demonstrate search capability. The product is renamed AnalogOS, with a global vision, and must find sectors through a documented procedure instead of listing known points.

## Decision

1. **Brand and scope.** The visible brand is "AnalogOS" with the subtitle "Planetary analog exploration · Chile–Argentina Pilot". The folder, remote, packages and hosting are not renamed. No claim of executed worldwide coverage is made.
2. **Bounded experiment.** Two test regions of 1° × 1° in CRS84: the Antofagasta interior `[-70.0, -25.5, -69.0, -24.5]` and the Puna of Catamarca and Salta `[-67.8, -26.5, -66.8, -25.5]`. Regular grid of 25 windows of 0,2° per region (442–449 km² each). They are a test selection, not a representative sample nor regions guaranteed to be unpublished.
3. **Stage 1, topographic priority.** NASADEM metrics with the v2 code for the 50 windows. Windows are rejected, with a record, if coverage is < 95 %, permanent water is > 5 %, or they contain published coordinates or a published study area. The ordering is the geometric mean of slope, roughness and relief with relative weights 0,20/0,20/0,15. It only orders: it is not the score or the confidence.
4. **Diversification.** Greedy, deterministic selection: up to 3 windows per country, centers at ≥ 25 km (geodesic), ties broken by identifier. The list is never completed by hand.
5. **Stage 2.** Up to 6 windows receive monthly Sentinel-2 2025, POWER and HLS inventory, with v2 formulas, weights and tolerances. Geology remains uncalibrated.
6. **Yungay as reference.** It is recalculated with its v2 data and the same rules, keeps 75,67 / 77,45 / 99,03, carries `role: reference` and stays outside the ranking. Its window is not the perimeter of each historical campaign.
7. **Prior work.** Versioned catalog with sources, review date and coordinates only when the publication provides them. A distinction is made between "contains a published sampling coordinate", "overlaps a study area", "proximity (25 km heuristic to the center, not the study perimeter)" and "regional precedent". No window is declared new; finding no matches does not prove novelty.
8. **Contracts.** `candidate-site` accepts `cl-` and `ar-`, adds `country`, `role`, `discovery` and `literature_review` (mandatory in v3) and the state `reference`. New contracts `discovery-search` and `precedent-catalog`. Historical snapshots continue to validate.
9. **Quality without false confidence** (approved by Codex, without changing v2):
   - Sentinel-2 completeness is measured against the 12 configured months; months that are duplicated, out of period, incomplete, in error, with inconsistent counts, or with non-finite or out-of-range values are discarded;
   - topographic quality is multiplied by the valid NASADEM coverage;
   - POWER is validated (units, fill value, finiteness, ranges) before scoring;
   - each raw data item is tied to its exact request; data from a different configuration stops the build.
10. **Authorities by country.** Restrictions not evaluated cite IDE Chile or IDERA as appropriate and remain pending. No permission or free terrain is inferred.
11. **Delivery.** `artifacts/science-v3/` and `artifacts/visual-context-v3/` are new; v2 is preserved byte for byte. The packager generates `submission/analogos-static.zip` with its checksum; the v2 ZIP remains as historical.

## Authorized and used limits

| Resource | Limit | Used |
|---|---:|---:|
| Topographic windows | 50 | 50 |
| New NASADEM tiles | 20 | 7 |
| New multisource windows | 6 | 6 |
| New RGB images | 6 | 6 (Yungay was reused from the v2 package) |

## Consequences

- The result may be uncomfortable and is shown anyway: the three Chilean candidates score higher than Yungay and the Argentine ones score lower.
- The difference for the Argentine ones is mainly due to the POWER climate context (562–767 mm/year), which describes a MERRA-2 cell of 0,5° × 0,625° and not rainfall measured at the site. Weights and values were not changed to correct it.
- Four Chilean windows with very high topographic priority were left out because they contain coordinates of the transect of Navarro-González et al. (2003).
- The delivery ZIP grows to ~9,0 MB because of the seven images.
- Changing regions, period, product or transformation invalidates the cache and requires new queries with credentials.

## What this decision does not claim

- There are no confirmed new analogs, nor field, geological or territorial validation.
- A window of ~440 km² is not entirely free or suitable terrain: the images show traces and structures that must be checked.
- Passing tests validate the software, not planetary equivalence.
