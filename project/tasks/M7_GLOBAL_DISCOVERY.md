# Current assignment — global AnalogOS, Chile–Argentina pilot

## Status

- **Task ID:** M7-GLOBAL-DISCOVERY
- **Owner:** Codex
- **Status:** accepted
- **Branch:** `dev`
- **Base commit:** `57b3a97bc13b712e98dae64ae28511fb2782c6c3`
- **Direction and acceptance:** Codex. Dan authorized this change and its supervision on 2026-11-14; he did not authorize publication of this deliverable.

**Subsequent authorization:** Dan asked “update dev” on 2026-11-14. Codex may create the commit and integrate/push this checkpoint to `origin/dev`, preserving the team's remote work. The earlier acceptance describes the pilot before that integration.

**Integration reviewed by Codex:** pilot v3 integrated with the team's ADR-006/007 (globe, 2D map and floating card); discovery ADR renumbered to 008. 177 Python, 69 web and build correct; current ZIP of 30 entries, SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Current details in STATUS and CODEX_M7_REVIEW. The original assignment and its report of 18 entries remain as historical records; the initial “no WebGL” restriction was superseded by the redesign decisions accepted by the team. Claude is still waiting for a new assignment.

**Codex acceptance — 2026-11-14 15:33 America/Santiago.** M7 accepted as a preliminary regional pilot. Independent verification: 167 Python tests, 39 web and build; identical v2/v3 rebuild, scores and selection recalculated, caches without network, deterministic ZIP and demo at `/` and `/AnalogOS/`. Evidence and limits in `docs/CODEX_M7_REVIEW.md`. No commit, push or publication. Claude is waiting for a new task; do not expand regions or recalibrate science on your own initiative.

## Objective

Convert the visible brand to **AnalogOS**, with a global vision and a real, bounded and reproducible pilot in Chile and Argentina. Yungay becomes a **known reference**, outside the ranking of emerging candidates. The deliverable must find sectors through a documented search, characterize them with real data and distinguish candidates from published precedents. It is not enough to add manually chosen points or change the map.

Keep the Mars rover profile, the Jezero regional reference, a static frontend without WebGL and offline evidence. Do not introduce a lunar profile or claim that worldwide coverage was executed. Label “Chile–Argentina Pilot” and the area actually explored.

## Reading and ownership

Read AGENTS.md, CLAUDE.md, STATUS.md, recent changes, ADR-001 through ADR-005,, docs/PRODUCT_AND_SCIENCE.md, DATA_AND_SCORING.md, contracts, configuration and v2 pipelines. The current instruction authorizes the expansions of candidates, contracts and scope that were previously frozen. Keep v2 and its profile byte for byte as a historical baseline; create v3.

Codex has already verified the baseline: 119 Python tests, 24 web and build green. The tree was clean on dev. While Claude implements, Codex will review without editing its scope. No subagents or parallel implementation sessions.

## First supervision checkpoint

Before any new massive queries or implementing the UI, deliver a compact plan in the chat: files, search configuration, maximum number of windows/requests, contract extensions and handling of references/novelty. You may prepare search code and bibliography while Codex reviews. If you propose changing the formula, weights, science thresholds, datasets or regions beyond what is authorized, wait for a concrete decision from Codex.

## 1. Reproducible search, not a manual list

Create a versioned configuration for a regional experiment. Authorized initial proposal in CRS84 [west,south,east,north]:

- Chile, interior of Antofagasta: `[-70.0, -25.5, -69.0, -24.5]`.
- Argentina, Puna de Catamarca/Salta: `[-67.8, -26.5, -66.8, -25.5]`.
- Regular grid of non-overlapping windows of 0,2°: 25 per region, 50 in total. Centers derived algorithmically from origin/step, stable IDs; geometry not drawn by hand. Document these regions as a test selection, not a representative national sample. Verify geography and extent before running; propose a correction if it fails.
- The windows do not have the same physical area: compute the real area and document the size ~20 km. Do not call them a 5 km grid.
- Stage 1: multi-tile NASADEM at the v2/MOLA scale, valid coverage, SWB water and topographic metrics for the 50 windows. Cache tiles; do not download them per window. Exclude from the shortlist lack of coverage (<95 %), permanent water >5 %, or overlap with documented references. Keep a record of each rejection. Do not treat unassessed territorial restrictions as resolved.
- Preselection order: geometric mean of slope/roughness/relief similarities with v2 relative weights 0,20/0,20/0,15; name it **topographic priority**, never final score or final confidence. Tie-break by ID. Do not relax the 0,70 minimum of the multi-source score to accept this stage.
- Deterministic diversification: up to three windows per country, with centers separated by at least 25 km (geodesic distance, versioned criterion). Also save the discards due to proximity. If there are fewer eligible candidates, show that; never force results or choose by hand to improve the narrative.
- Stage 2: characterize those six windows at most with NASADEM + Sentinel-2 monthly 2025 + POWER, using v2 formulas and weights. Keep geology uncalibrated. HLS remains an inventory, without using its pixels in the score. Save each failed attempt and NoData; do not substitute missing data with fictitious data.
- Reuse the Yungay reference with the same v2 geometry/metrics/evidence and recompute it through the same rules if it is included in v3: it must keep the baseline numerical values. Document that the screening window is not the exact perimeter of each historical campaign.
- Process preselection first and then the more costly sources. Initial limit: 50 topographic windows, up to 6 new multi-source windows, up to 20 additional NASADEM tiles, up to 6 new RGB images. Bounded retries and resumable cache, with no extra sweeps if an API fails. Report early blockage.

The review must be able to reconstruct why each window was evaluated, discarded or selected. Save config, metrics for all windows, preliminary ranking, reasons, shortlist, real acquisition timestamps and hashes. The explored area and the number evaluated must be visible in the demo and export.

## 2. Precedents and Yungay reference

Create a versioned, reviewed catalog of precedents, with sources, review date, coordinates/geometry when the publication provides them, spatial precision and proven activity. No invented coordinates, and do not assign the point of a town to the scientific area.

Initial sources cross-checked by Codex:

- Challenge: https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/
- NASA, Hyperion in Atacama in 2003 and Zoë subsequently: https://astrobiology.nasa.gov/news/dry-signs-of-life/ (does not prove continuous occupation of the same Yungay polygon).
- Navarro-González et al. 2003: https://pubmed.ncbi.nlm.nih.gov/14605363/ ; source with sampling coordinates: https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/2010JE003599
- María Elena South, 2015: https://enviromicro-journals.onlinelibrary.wiley.com/doi/abs/10.1111/1758-2229.12261 (do not assume it coincides with Pampa María Elena from v2).
- Argentina also has precedents: https://bicyt.conicet.gov.ar/fichas/produccion/12391989 and https://tecno.unca.edu.ar/la-puna-catamarquena-un-sitio-con-similitudes-al-planeta-martela-puna-catamarquena-un-sitio/ (Campo de Piedra Pómez, Dunas Blancas, Carachi Pampa and the surroundings of Antofagasta de la Sierra).

Review primary sources and bibliography for the zones finally selected; record searches/date/scope and findings. If a published study area is more extensive than a point, do not use only distance to the point to declare independence. Separate exact spatial relationship, proximity and region with precedents. The absence of a match in an incomplete catalog does NOT prove novelty.

Suggested statuses: `known_reference`, `known_analogue_overlap`, `regional_precedent`, `literature_review_pending`, `no_match_in_reviewed_sources`. Separate the site role (`reference` / `candidate`) from the bibliographic review status. Yungay is always a known reference. A search result with a precedent must retain it; do not hide it to feign discoveries. Do not adjust weights to make new candidates win or claim scientific validation because Yungay scores high.

## 3. v3 snapshot and contracts

- Create `artifacts/science-v3/`, search configuration and a v3 profile derived from v2 with the same weights/formulas/tolerances. Version the new provenance and scope; do not mutate v2 scientific files.
- Extend IDs beyond `cl-` (coherent, validated country prefix, at least `cl`/`ar`) and add typed metadata for country, role, search origin and bibliographic review. Prefer an additive extension compatible with historical snapshots; strictly validate extra v3 requirements. Do not slip in fields without a contract.
- References separate from the candidate ranking, but comparable and exportable with their role and source. Do not omit their status in exports.
- Real manifest of all data, synchronized profile/snapshot, linked metrics and sources, explicit rejections and limitations. Save real timestamps; do not copy the v2 acquisition date to new data.
- Generalize authorities/warnings by country. Do not attribute IDE Chile to Argentina. Keep sensitive areas, urban areas, property and access as pending when there is no official cross-check. You may integrate a verifiable official layer if it turns out to be small and necessary; document version/date and do not infer permits. Do not invent boundary data or declare “free” due to absence of data.
- Correct along the way quality assumptions that would give false confidence to new data (e.g. counting 12 expected months even if the API returns fewer, exclusion of NoData), with regression tests and without arbitrarily altering qualities/weights. If the numerical baseline changes, report it before accepting it.

## 4. AnalogOS application

- Visible brand “AnalogOS”; subtitle “Planetary analog exploration · Chile–Argentina Pilot”. Do not rename the folder, remote, packages or hosting for cosmetic reasons.
- Adaptable offline SVG map with both countries and a useful framing of the regions; real outlines with attribution, without drawing countries by hand. Countries as geographic context, not legal authority.
- Visually separate “Search candidates” from “Known reference: Yungay”. Country filter, card, comparison and export must work with both roles. The first selected item must be a candidate, unless there are none; honest empty state.
- Show search extent and limits, counts, preselection criterion, precedent evidence and review status. Do not promise a complete global search or confirmed new analogs.
- Real offline RGB context for the selected sites, with a parameterizable visual pipeline and validation tied to snapshot/config. Preserve the v2 visual package. Sources/period/NoData and the absence of an image must remain clear.
- Maintain contrast, keyboard and mobile support. Avoid unnecessary redesign.

## 5. Delivery and checks

Extend the packager to v3 with an explicit list derived from validated metadata (no permissive glob), safe paths, hashes, no leftover v2/demo files or secrets, while retaining rollback and the deterministic ZIP. Keep the historical v2 ZIP; new deliverable `submission/analogos-static.zip` with its own checksum. Update the active narrative of the README, product/science docs, submission/pitch/script/attributions/checklist and screenshots if the UI changed; do not rewrite the history of earlier ADRs. Create ADR-008 as proposed and a search/bibliography report.

Required tests: grid and limits; reproducible distances and ties; NoData/water; selection without manual intervention; separation of role/bibliographic review; exclusion of references from the ranking; cl/ar and historical contracts; sources/authorities by country; incomplete temporal coverage; reproducible v3 generation; export preserves role/origin; map and filters; missing or invalid visual file; safe packaging without extras and deterministic. Do not inflate tests by mirroring the implementation.

Minimum commands:

```bash
source .venv/bin/activate
# Document the exact new commands: discovery, bounded fetch, v3 build, images.
npm run verify
npm run release:package
# Verificar checksum del nuevo ZIP, repetir empaquetado, comparar bytes.
git diff --check
git status --short
```

Codex will repeat the checks and audit the search results, at least one candidate from each country, references, sources, images and demo in `/` and `/AnalogOS/`. Show the result even if it is negative. Green tests validate software, not planetary equivalence or field suitability.

## Files and authority

Authorized: new v3 config/contracts/pipelines/artifacts/outlines and v3 visuals; necessary changes to existing pipelines with v2 compatibility, tests, apps/web, scripts/packaging, docs, submission and project. Existing dependencies first; justify the need before adding new ones. No .env read by tools, do not print secrets. Use existing credentials only from the program and official Earthdata/Copernicus endpoints; earlier limits apply. Read-only network access to primary sources is authorized. No AGENTS/CLAUDE, accounts, remotes, .vercel, main, commits, push or publication.

Deliver a report with files, commands, counts per stage, results per country, bibliographic evidence, failures/NoData, ZIP size, limitations and unversioned raw data. Update STATUS/CHANGELOG/BACKLOG. Leave **Owner: Codex / Status: review**; only Codex accepts.

## Claude's report

Delivered in `review` on 2026-11-14 at 15:27 (America/Santiago). Only Codex accepts. No commit, push or publication.

### Checkpoint decisions approved by Codex

1. `status: reference` in addition to `role` for the reference.
2. Sentinel-2 completeness against the 12 configured months.
3. Topographic quality multiplied by valid NASADEM coverage.
4. 25 km to the center as an explicit proximity heuristic, not the study perimeter nor proof of novelty.

Geography authorized as a limited pilot. They are recorded in ADR-008.

### Counts per stage

| Stage | Result |
|---|---|
| Windows attempted / evaluated | 50 / 50 |
| Rejected due to coverage, water or data failure | 0 |
| Excluded for containing published sampling coordinates | 4 |
| Discarded due to proximity | 2 |
| Eligible but outside the quota | 38 |
| Shortlisted (stage 2 complete) | 6 |
| Sentinel-2 months rejected / API failures | 0 / 0 |

Network usage against the limits: 7 new NASADEM tiles out of 20; 6 multi-source windows out of 6; 6 new RGB images out of 6 (Yungay was reused from the v2 package). In addition, 7 CMR tile searches, 6 HLS inventories, 6 POWER queries and 1 Natural Earth outline download.

### Results by country

| Role | Site | Topographic priority | Similarity | Confidence | Stability |
|---|---|---:|---:|---:|---:|
| Candidate | `cl-win-s2500-w06970` | 98,01 | 94,87 | 77,45 | 99,33 |
| Candidate | `cl-win-s2480-w06950` | 96,16 | 91,87 | 77,45 | 99,03 |
| Candidate | `cl-win-s2520-w06950` | 93,58 | 90,35 | 77,36 | 99,08 |
| Candidate | `ar-win-s2620-w06750` | 86,07 | 63,85 | 77,00 | 95,88 |
| Candidate | `ar-win-s2640-w06730` | 64,53 | 53,68 | 77,25 | 96,81 |
| Candidate | `ar-win-s2580-w06710` | 59,26 | 49,43 | 77,40 | 96,81 |
| Reference | `cl-pampa-yungay-screening` | 66,40 | 75,67 | 77,45 | 99,03 |

The six scores match Codex's independent calculation. Yungay retains exactly the v2 values (dedicated test). All remain at `requires_review`.

### Bibliographic evidence

- Catalog `config/analog_precedents_v1.json`: 6 background references, 30 coordinates transcribed from the supplementary material of Navarro-González et al. (2003), 3 targeted searches with date, scope and finding.
- 17 coordinates fall within the Yungay window and 5 in the Chilean region, within the 4 excluded windows.
- The Argentine sources reviewed give no coordinates; none was assigned to the place names.
- The six candidates remain as `regional_precedent`. None is declared new.
- The JGR article 2010 and the ADS record of the Icarus study 2020 could not be opened (it asked for human verification, which was not attempted to be bypassed).

### Own files

- Configuration: `config/discovery_search_v3.json`, `config/analog_precedents_v1.json`, `config/visual_observations_v3.json`, `config/mission_profiles/mars-rover-screening-v3.json`.
- Contracts: `contracts/candidate-site.schema.json` (additive extension), `contracts/discovery-search.schema.json`, `contracts/precedent-catalog.schema.json`.
- Pipelines: `discover_candidates.py`, `fetch_discovery_data.py`, `build_discovery_snapshot.py`, `build_context_outline.py`; compatible changes in `build_precision_snapshot.py` (`score_inputs`, `TerrainDataError`, `expected_intervals`) and `fetch_visual_context.py` (`--snapshot v3`, reuse, `post_json`).
- Artifacts: `artifacts/science-v3/` (7 files) and `artifacts/visual-context-v3/` (index and 7 PNGs).
- Web: `App.tsx`, `index.html`, `styles.css`, `components/CandidateMap.tsx`, `CandidateRanking.tsx`, `CandidateComparison.tsx`, `CandidateDetails.tsx`, `data/loadDemoSnapshot.ts`, `data/loadVisualContext.ts`, `domain/contracts.ts`, new `domain/discovery.ts`, `scripts/prune-build.mjs`, tests `discovery.test.tsx` and `visualContext.test.tsx`.
- Delivery: `scripts/package_release.py`, `tests/test_release_package.py`, `submission/analogos-static.zip`, `submission/analogos-static.zip.sha256`, `submission/assets/analogos-pilot-overview.jpg`, `package.json` (scripts `discovery:*`).
- Tests: `tests/test_discovery.py`.
- Documentation: ADR-008, `docs/DISCOVERY_REPORT.md`, `docs/VISUAL_REVIEW.md`, `docs/PRODUCT_AND_SCIENCE.md`, `docs/DATA_AND_SCORING.md`, `README.md`, and in `submission/`: `README.md`, `PROJECT_PAGE_ES.md`, `PROJECT_PAGE_EN.md`, `PITCH_3_MIN_ES.md`, `DEMO_SCRIPT_2_MIN_ES.md`, `METHODOLOGY.md`, `RESULTS_AND_LIMITATIONS.md`, `ATTRIBUTIONS.md`, `JUDGING_CHECKLIST.md`, `VIDEO_SHOT_LIST.md`.
- Project: `NEXT_TASK.md`, `STATUS.md`, `CHANGELOG.md`, `BACKLOG.md`.
- `AGENTS.md`, `CLAUDE.md`, remotes, branches, `.vercel` and `vercel.json` were not touched.

### Commands and results

```bash
source .venv/bin/activate
python -m pipelines.fetch_discovery_data --stage tiles     # 7 teselas nuevas
python -m pipelines.discover_candidates                    # 50 ventanas, 6 preseleccionadas
python -m pipelines.fetch_discovery_data --stage sources   # 6 × Sentinel-2, POWER y HLS
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3     # 6 new images; now reuses without network
npm run verify
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
git diff --check
git status --short
```

| Check | Result |
|---|---|
| `npm run verify` | 167 Python tests, 39 web tests, contracts + TypeScript + Vite green |
| `npm run release:package` | sha256 `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415` |
| Second packaging | identical bytes (`cmp`) |
| ZIP v3 | 18 files, 9.012.267 bytes: `index.html`, JS, CSS, 7 of `science-v3/`, visual index and 7 PNG |
| ZIP v2 and `SHA256SUMS.txt` | intact; `shasum -c` OK |
| `git diff --quiet HEAD` on v2, demo, v1, visual package v2 and profile v2 | code 0 |
| Rebuild of v2 in a temporary folder | byte-for-byte identical across its 5 files |
| `git diff --check` | clean |
| Demo over HTTP at `/AnalogOS/` (headless Chrome) | 7 cards, 50 windows, local image; everything responds 200 except `favicon.ico` |

New tests: 37 in `tests/test_discovery.py` and 15 in `discovery.test.tsx`, covering grid and bounds, distances and ties, NoData and water, selection without intervention, per-window failures, relationships with prior work, role/review separation, reference outside the ranking, `cl`/`ar` contracts and historical ones, authorities by country, incomplete temporal coverage, malformed rows, POWER, request identity, v3 reproducibility, negative experiment, export, map, filters and visual package.

### Failures and NoData

- No window failed or fell below the 95 % coverage threshold; none exceeded 5 % water.
- The 72 Sentinel-2 months of stage 2 were valid.
- The first network test of the previous task failed due to a connection error; in this one there were no API failures.

### Limitations and decisions to review

- Two test regions; this is not a national or global search.
- POWER in the Puna (562–767 mm/year) comes from a cell larger than the window and dominates the difference among the Argentine candidates. It is exposed in the record, manifest and documentation; nothing was changed to compensate for it.
- Two Chilean candidates have matching POWER values; this is labeled as a possible shared cell.
- The catalog of prior work is incomplete; full texts of the Puna literature are missing.
- The visual observations are appearance to be checked; there was no territorial cross-check.
- The ZIP uses no compression and weighs 9,0 MB because of the seven images.
- `__version__` of the pipeline remains at 0.2.0 so as not to alter the regeneration of v2 and of the demo snapshot.
- The `assets/analogos-chile-*.jpg` captures and the v2 ZIP remain as historical records.

### Unversioned raw data

In `data/raw/`: 7 new NASADEM tiles (~102 MB), `copernicus/sentinel2_stats_2025_v3.json`, `power/climatology_points_v3.json`, `earthdata/cmr_inventory_v3.json`, `discovery/acquisition_v3.json` and `naturalearth/world-atlas-2.0.2-countries-50m.json`.

### Credentials and permissions

Earthdata and Copernicus credentials were read only by the programs and sent only to official hosts. No values, tokens or headers were printed or stored. No unrelated process was stopped. No permission was blocked.
