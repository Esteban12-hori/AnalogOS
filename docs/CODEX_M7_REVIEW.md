# M7 Review and Acceptance — Codex

Date: 2026-11-14. Implementation: Claude Desktop Code. Direction, review and acceptance: Codex. The initial scientific acceptance was carried out on `57b3a97bc13b712e98dae64ae28511fb2782c6c3`; its checks and its package of 18 entries remain as historical evidence. Dan subsequently authorized updating `dev` and Codex integrated the remote redesign.

## Integration review for dev

The current delivery combines the `1302ed8` pilot with the globe, MapLibre, floating card, magnitude visualization and the team's series. Yungay keeps REF and remains outside the ranking in all views. The paths of the seven v3 images, ranking propagation, and the fit of the selector/card with long names were fixed. The auditable search and the country filter remain in their own section. The team's ADR-006/007 are preserved; the discovery one is renumbered ADR-008.

- 177 Python tests, 69 web, TypeScript and build correct. New regressions: the seven v3 visual paths, series for the seven sites and REF with no rank 7.
- ZIP: 30 entries, 12.865.983 bytes; SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Repeated byte for byte and checked against dist; it admits reachable chunks, textures and basemaps without relaxing snapshot validation.
- The eleven hashes of the v2 scientific baseline remain identical. The v3 scientific and visual artifacts do not change with respect to the accepted checkpoint. The historical v2 ZIP is kept in the team's remote version.
- ZIP served at `/AnalogOS/`: globe, Argentine candidate, its Sentinel-2 in 2D map, Argentina filter and Yungay verified. Desktop and mobile 390 px without horizontal overflow. No application errors recorded on that local server.
- Current capture: `submission/assets/analogos-integrated-dev.jpg`. Reproduction: `source .venv/bin/activate && npm run verify`, then `npm run release:package`.

This integration authorizes delivery to `dev`; the scientific limits below remain in force. The historical offline checks are not presented as a new audit of all the optional services of the redesign.

## Decision

Accepted as a preliminary regional pilot of AnalogOS. 50 windows were evaluated in two test regions of Chile and Argentina (≈22.274 km²), six were preselected using versioned rules and characterized with real data. Yungay remains as a known, comparable and exportable reference, outside the ranking. None of the six results is a confirmed new analog.

## Independent evidence

| Codex check | Result |
|---|---|
| `source .venv/bin/activate && npm run verify` | 167 Python tests, 39 web, contracts, TypeScript and Vite correct |
| v3 rebuild in temporary directory | Its six JSON files match the delivered artifacts byte for byte |
| v2 rebuild after modifying shared code | Its five files match the historical ones byte for byte |
| Eleven hashes taken before starting | Snapshot, configuration, profile and v2 images intact |
| Bibliographic coordinates | 30 degree/minute/second conversions verified; five points within the Chilean region explain four excluded windows |
| Preselection | The 50 priorities recalculated independently and the greedy selection reproduce the six IDs; minimum distance between selected centers ≈29,831 km |
| Scores | Independent calculation from topography, Sentinel-2 monthly statistics and POWER responses reproduces the six similarities and confidences |
| Quality and provenance | Rejections for missing band, incorrect interval, negative NoData, POWER fill value and incompatible request identity reproduced and fixed |
| Negative result | Builder tested with empty shortlist and absent or empty stage 2 stores; it keeps Yungay and does not invent acquired sources |
| Cache | The 18 multi-source entries and both visual packages are reused with network/login clients replaced by deliberate failures; they are not invoked |
| Images | Inspection of the six new PNGs; preliminary observations incorporated per card, without inferring facilities, ownership or permits |
| Independent browser | Argentina filter, Argentine card, Yungay, comparison, JSON export and keyboard map selection; mobile and desktop review with no horizontal overflow observed |
| Real export | File downloaded from the browser keeps country AR, role candidate, origin grid_search and status regional_precedent |
| Extracted ZIP | Application and local images load at `/` and `/AnalogOS/`; application console without errors during the review |
| Packaging repeated by Codex | 18 entries identical to the build; repeated ZIP identical to the delivered one; checksum correct |
| Hygiene | `git diff --check` correct; no dependencies, remotes or scientific baseline were modified |

The automated tests cover missing image/invalid metadata, empty selection, historical and v3 contracts, authorities by country, per-window failures and safe packaging. They do not replace a scientific or field review.

## Corrections returned during supervision

- Record a missing tile or NoData per window, keeping the remaining experiment.
- Measure Sentinel-2 completeness against the expected months and validate intervals, bands, ranges and counts.
- Bind data reuse to the exact request also during the build.
- Do not score fill values or invalid climate responses.
- Warn that POWER represents regional context of a cell larger than the windows. Matching values are not enough to claim that two queries identified the same cell.
- Incorporate visual observations per candidate without turning them into territorial identification or modifying scores.
- Support a search without preselection and distinguish attempted windows from evaluated ones.

## Scientific delivery accepted before integrating the redesign (historical)

- ZIP: `submission/analogos-static.zip`, 9.012.267 bytes.
- SHA-256: `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415`.
- Scientific and bibliographic report: `docs/DISCOVERY_REPORT.md`.
- Decision: ADR-008 accepted.
- Overview capture: `submission/assets/analogos-pilot-overview.jpg`.

## Limits and next work

The approval refers to the implementation and reproducibility of the pilot, not to the suitability of the terrain. The six candidates keep `regional_precedent` and `requires_review`. The full texts and coordinates of the Argentine studies remain to be reviewed, official territorial layers cross-checked, and POWER contrasted locally in the Puna. The ~460–480 m topographic resolution does not measure obstacles or traction at wheel scale. The assigned weights and qualities are maintained; confidence is not equivalent to probability of success.

The next implementation unit must prioritize territorial exclusion and bibliographic evidence before expanding regions. A new explicit assignment to Claude is pending. No other sweep or publication is started automatically.
