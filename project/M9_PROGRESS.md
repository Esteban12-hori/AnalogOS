# M9 — implementation progress and review

## Codex checkpoint — delivery completed

A/B review and local QA finished; readability fixes and historical warnings applied by Codex. 316 Python, 246 web, build/typecheck, baseline49 intact, deterministic ZIP `eed86833…6520c`. Real download validated and mobile/keyboard/offline checked. See `docs/CODEX_M9_REVIEW.md`. Published to dev (`34e76b9`, Actions 43658989969 successful); remote geology/export and the two Anthropic operations verified, recalculated JSON identical. The following sections preserve the history of Claude's deliveries.

## Phase B — IMPLEMENTED, for Codex review (2026-11-14)

Two edges of A closed beforehand: (1) `publish` now records as `PackageStateError` (with path, actual state and preserved `.previo` backup) the case where installing the staging fails and restoring the backup of the SAME pair also fails (tested on the first and the second pair; earlier pairs are still rolled back); (2) `check_geometry_dict` requires the exact closure of each ring (tested in Chile and Argentina; real data still passes and the package did not change).

### What was done

- **Structure**: `pipelines/geology_policy.py` (constants and pure rules, no geoprocessing); `geology_contract.py` depends only on it and on `jsonschema`; `build_export`/`validate_export` and `contracts/geology-export.schema.json` (self-contained; non-divergence test against the package schema).
- **Web**: `domain/geologyContext.ts` (Ajv contract + mirrored semantics, export, formatting), `data/loadGeologyContext.ts` (8 s timeout that covers the body, 2 MB cap, never throws), `components/GeologyContext.tsx` (compact card + expandable details + accessible download button), wiring in `App.tsx`/`CandidateDetails.tsx` and styles in `styles.css` within the existing glass style. No polygon map, no filters, without touching `shared/`, `server/`, `api/`, M8, science, profiles or AI.
- **Export**: `<site_id>-geology-context.json`, subset of one sector with the necessary requests; `full_candidates_file_sha256` is not confused with the subset. Validated before downloading.
- **Packager**: optional `geology-context-v1/index.json` (the only file in its folder), fully validated with the single validator against the bytes of `candidate-details.json` from the build; deferred import; without the folder, ZIP as before.
- **Docs**: README, `docs/GEOLOGY_CONTEXT.md` (product, export, packaging), `docs/DATA_AND_SCORING.md`, `docs/SOURCE_CATALOG.md`, ADR-010 (decisions 12–16 and gaps).

### Verification

- `npm run verify`: **316 Python**, **245 web** (+2 real AI tests skipped), server typecheck and build correct.
- New tests: 49 web (real package, 30 mutations of links/fractions/policy/URL, export, parity with the Python reference export, tolerant loading with a hanging body, honest formatting, card in four states, long names) and Python (export, schema drift, dependency isolation, 10 of the packager).
- `npm run release:package` twice: identical ZIP (`cmp`), 31 entries, 13220555 bytes, SHA-256 `579a4fedf5e5cee8f3653ac8e3c3fc62995518d4cc42f747862cdc5581d674be`, `shasum -c` OK. It contains `geology-context-v1/index.json` (190.198 bytes, identical to the artifact) and nothing from raw/research. Extracted under `/AnalogOS/` and served over HTTP: `index.html` and the geological package respond 200.
- Geological package not recalculated (content unchanged): SHA-256 `fe2552dd…856c`; offline rebuild identical. Baseline of 49 files intact; `git diff --check` clean. No network refresh in this phase.
- `submission/analogos-static.zip` and its `.sha256` change (v3 delivery regenerated with geology).

### Real gaps

- No browser QA was done (desktop, 390 px, keyboard, real download, ZIP in browser): Codex does it. There is only static rendering (`renderToStaticMarkup`) and byte/HTTP verification.
- The web does not compute SHA-256: the candidates hash, and `request_id` are verified by the pipeline and packager.
- The style uses 9–12 px sizes consistent with the rest of the card; if the visual review finds them too small, adjust.
- A temporary `http.server` server on port 8765 (manual check) may still be running: the sandbox did not allow terminating it; it has no effect on the repo.
- The reference export (`tests/fixtures/geology-export-ar-win-s2640-w06730.json`) must be regenerated if the package is rebuilt with new dates.

## Phase A — CORRECTED after Codex review (2026-11-14); awaiting its approval

The details of the correction are in the next section; what follows describes the original delivery and remains valid except where indicated.

Phase B (UI, export, packager/ZIP) **pending**; not started. No commit or push.

### Corrections from review A (docs/CODEX_M9_REVIEW.md)

| Finding | Correction | Permanent regression |
|---|---|---|
| P1 Duplicate MultiPolygon accepted (total change 50 %) | `_diagnose` additionally requires ORIGINAL TOTAL / REPAIRED TOTAL change ≤ 0,001; non-positive or non-finite original → rejection with mask; the symmetric make_valid/buffer(0) contrast is kept and recorded | `test_material_total_area_change_is_rejected_…`, `test_original_area_not_positive_…`, `test_accepted_repairs_satisfy_all_three_…` |
| P1 Internal NaN / malformed leaves | `check_geometry_dict`: Polygon/MultiPolygon structure and every vertex 2D, finite and in range, BEFORE Shapely; Chile and Argentina use the same check (`validate_chile_collection` and `validate_wfs` call `parse_features`) before installing; AR with 0 entities and `crs: null` remains valid | 16 parametrized malformed geometries; `test_chile_and_argentina_share_the_geometry_control_…` |
| P1 Refresh with a Point replaces the cache | `prepare_raw` downloads and validates in staging; the build constructs the index and validates BEFORE installing; `publish` replaces cache and package as a pair with rollback (cache first) | `test_fresh_layer_with_a_point_…`, parsing failure, injected validation, failure of the second replacement (restores raw and package), rollback failure (`PackageStateError`, truthful message), offline reuse without copies |
| P1 AR4 may cite AR6 | Semantics: an Argentine sector cites exactly ONE `argentina_wfs` request with its `site_id`; the URL has the exact form and its bbox (exact numeric parse, no rounding) is that of the sector; `request_id` = SHA-256 of method+URL recalculated; one request per sector | `test_ar_site_cannot_cite_another_sector_acquisition`, `test_wfs_request_bbox_…` (1e-6, 1e-12 and 6 decimals) |
| P2 CL cites only metadata | A Chilean sector must cite `chile_layer`; the metadata may be additional | `test_chile_site_must_cite_the_layer_download_…` |
| Cache: name/symlink | Safe name and not a symlink before opening (O_NOFOLLOW); roles, types, dates, bytes, hashes, number of entities and undeclared files consistent | symlink with the same bytes, 6 unsafe names, extra file, 9 inconsistent records |
| CC0 license | `license_id` is read from CKAN; the build is rejected if it is not `cc-zero`; the package carries `declared_id` | `test_changed_ckan_license_is_rejected_…` |
| Formats narrative | Derived from the resource actually inspected and from `rejected_resources` | `test_metadata_reflects_only_observed_resources_…` |
| SIGAM | «Sistema de Información Geológica Ambiental Minera» | same test |
| Method | COMMON_TRANSFORMATIONS, LIMITATIONS, docstrings, ADR-010 and docs aligned with the overlay in EPSG:6933 (approved) | — |
| Code text test | Replaced by a functional one: request headers with secrets in the environment | `test_requests_carry_no_credentials_…` |

Additionally: the `policy` of the package must match the current policy and every accepted repair must meet the three limits (semantic validation).

The three `/tmp/analogos-m9-independent-review.py` cases now give `true, true, true`; the two provenance ones have regressions. The script rewrites `/tmp/analogos-m9-independent-review-results.json` when run.

**Real package recalculated FROM THE CACHE, without network or refresh** (original acquisition dates preserved): SHA-256 `fe2552dd…856c`, repeated offline rebuild identical. Same coverage, ambiguity and diagnostics numbers as the following table (only metadata changes: license with `declared_id`, SIGAM distributor, narrative, policy with the total change limit). Comparison with the audit: within 1e-3 pp in the test, actual difference ≤ 5e-5 pp. The four real repairs meet the three limits (total change 0–1,6e-15; symmetric difference 0).

Verification: **297 pass** (49 more), of which 120 geological; 196 web (+2 skipped), typecheck and build correct; baseline of 49 files intact; `git diff --check` clean. `npm run release:package` was not run (it keeps failing until B).


### Decisions approved by Codex for phase A (recorded in ADR-010)

1. WFS per sector; fresh download (CKAN + Chile ZIP + 3 AR queries); public hosts and limits. BBOX returns complete polygons: the CRS/lon/lat ranges are validated and that the bbox of each entity intersects the query, and then it is clipped; entities without positive intersection are valid; inverted axes are not accepted without checking position.
2. No hash of rounded coordinates or ad hoc SHA-256: exact geometry preserved (all rings) with strict numeric structural equality in Python/web; SHA-256 of the `candidate-details.json` file as provenance, verified in pipeline and packager; web without cryptography.
3. Conservative states (`available` only full coverage ≤ 1e-8, without ambiguity/rejections/missing description; 99 % is `partial`).
4. Repair: `make_valid` vs `buffer(0)`, independent limits 0,1 % (entity) and 0,05 % (sector); rejection → bbox∩AOI as a conservative mask subtracted from all units.
5. Shapely `>=2.2,<2.3`, version in `processing`; no pyshp/GDAL/GeoPandas.
6. Preserve the previous one on failures; contract and semantic validation before replacement; raw with exact request and `acquired_at`; no build time.

### Own decision (approved by Codex in review A)

Overlay and clipping in the EPSG:6933 plane (validity/repair in lon/lat). Reason: operating in degrees and measuring projected broke additivity (~2e-7 of the sector) and the closure of the partition. Effect versus the audit ≤ 5e-5 percentage points. Details in ADR-010 §7. If you prefer pure lon/lat, it would be necessary to measure with an exact integral instead of projecting vertices.

### Real results (package `artifacts/geology-context-v1/index.json`, SHA-256 `fe2552ddaedf61c7c54a35081d4cf3977d2806ec7127298bc564a89a7630856c`)

| Sector | Status | Covered | Without coverage | Ambiguous | Units | Audit (covered / without cov. / ambiguous) |
|---|---|---:|---:|---:|---:|---|
| `cl-win-s2500-w06970` | partial | 99,389372 % | 0,610628 % | 0,831560 % | 5 | 99,389364 / 0,610636 / 0,831551 |
| `cl-win-s2480-w06950` | partial | 99,224138 % | 0,775862 % | 0,823337 % | 6 | 99,224112 / 0,775888 / 0,823327 |
| `cl-win-s2520-w06950` | partial | 99,286114 % | 0,713886 % | 0,558495 % | 6 | 99,286114 / 0,713886 / 0,558495 |
| `ar-win-s2620-w06750` | partial | 49,998417 % | 50,001583 % | 0 % | 7 | 49,998418 / 50,001582 / 0 |
| `ar-win-s2640-w06730` | no_coverage | 0 % | 100 % | 0 % | 0 | 0 / 100 / 0 |
| `ar-win-s2580-w06710` | available | 100 % | 0 % | 0 % | 7 | 100 / 0 / 0 |
| `cl-pampa-yungay-screening` | partial | 99,068520 % | 0,931480 % | 1,183567 % | 6 | 99,068499 / 0,931501 / 1,183521 |

Sector areas identical to the audit (447,301089 … 450,519184 km²). The values come from the calculation; the audit is a control compared in a test (tolerance 1e-3 pp), not copied. Zero missing descriptions and zero rejected features across the seven sectors. Argentina 6 is `available` because its 250K layer covers the entire sector with no overlap or empty description; that is complete cartographic evidence, not quality.

### Repair diagnostics (all accepted; no mask)

Unique CL features 824, 846 and 9388 and AR `e250K_UnidadGeologica.117363`, all "Ring Self-intersection". Relative change in total area original→repaired 0–1,6e-15; symmetric difference `make_valid` vs `buffer(0)` 0,0 km² in all; no dimensional discard. 846 (1296 km² total) has a crossed bbox: clipped area 0 in Chile 1 (`accepted_no_positive_intersection`) and 26,45 km² in Yungay. 824: 190,55 / 250,40 / 0 (Chile 3) / 20,31 km² clipped depending on the sector. 9388: 0,118 and 43,24 km². AR 117363: 14,49 km² clipped. Detail by sector in `geometry_diagnostics`.

### Sources and actual acquisition

CKAN `package_show` (3.590 bytes); ZIP of the resource labeled SHP (5.995.050 bytes, SHA-256 `916fad22…95a3`, identical to the research cache) containing a single GeoJSON of 16.364 features (115 with null geometry); three WFS per sector (46, 0 and 28 features). The Chilean layer does not declare a map date; CKAN `metadata_modified` 2026-04-21 is recorded as `catalog_modified_at`. SIGAM has no survey date. All WFS responses with features carry CRS EPSG:4326; the zero-feature one carries `crs: null` (valid and documented).

### Phase A files

New: `contracts/geology-context.schema.json`; `pipelines/{fetch_geology_data,geology_coverage,geology_contract,build_geology_context}.py`; `artifacts/geology-context-v1/index.json`; `tests/{geology_fixtures,test_geology_coverage,test_geology_fetch,test_geology_context}.py`; `docs/decisions/ADR-010-geology-context.md`; `docs/GEOLOGY_CONTEXT.md`; this file. Modified: `pyproject.toml` (Shapely only), `project/{NEXT_TASK,STATUS,CHANGELOG}.md`. Preserved unchanged: Codex research documentation and evidence, `science-v2/v3`, M8, `shared/`, `server/`, `api/`, workflows, Vercel.

### Verification

- Original delivery: 248 pass (177 previous + 71 geological); after the fix, 297.
- `npm run verify` with the venv: 248 Python, 196 web (+2 real AI tests skipped), server typecheck and build correct.
- Offline rebuild repeated twice: identical SHA-256. `git diff --check` clean. Baseline `/tmp/analogos-m9-baseline-hashes.json`: 49 files, none changed.
- Tests: holes, multipolygons, a polygon that broadly crosses the edge, duplicates vs conflicts, zero/minimal coverage, missing description, bowtie rejected with mask, accepted repair with discard, CRS/schema/truncation/limit/inverted axes, unsafe ZIP/bomb/Shapefile, hosts and redirects, byte limits, no echo of error bodies, corrupt cache/different geometry (1e-9°)/different request, failure that preserves cache and package, invalid contract that does not replace, 17 semantic manipulations, deterministic offline rebuild. Fixtures only in tests, labeled synthetic.

### Gaps and risks to review

- **`npm run release:package` now fails** ("Unexpected file in the build: geology-context-v1/index.json") because `publicDir` copies the package to `dist` and the packager does not support it yet; it keeps the previous ZIP (`submission/` unchanged). It is resolved in B (explicit list). If publishing is needed earlier, that minimal change must be brought forward or something else decided.
- Status `available` for Argentina 6 is complete cartographic coverage, not quality: the UI in B must separate percentage, status and scale.
- The geology (including that of the source) was not validated in the field; provisional thresholds; straight edges in the plane.
- Fresh acquisition with a single response per request; the sources may change and a future `--refresh` will show the actual change.
- NEXT_TASK moved to `review` upon delivery; I did not mark `in_progress` at the start (assignment and start occurred in the same session).

### Pending phase B

`apps/web/src/domain/geologyContext.ts` (contract + semantics + exact geometry equality) and `data/loadGeologyContext.ts` (tolerant optional loading); "Geological context" card in `CandidateDetails.tsx`; own JSON export with a stable name; `scripts/package_release.py` with optional validated `geology-context-v1/index.json` (including SHA-256 of `candidate-details.json` reading bytes and semantics); web and packager tests; repeatable ZIP under `/AnalogOS/`; UI texts; note that the M8 AI does not consume geology.
