# M9 — Official geological context by sector

## Status and authorization

- **Task ID:** M9-GEOLOGY-CONTEXT
- **Owner:** Codex
- **Status:** accepted — M9 completed and published to dev (`34e76b9`, Actions 43658989969); independent review and remote geology/AI correct. Claude has no new assignment.
- **Branch:** dev
- **Base commit:** 92392f1181133ee2b86fb6b13c97ec9b10de021d
- **Direction/review/acceptance:** Codex. Dan approved the recommendation of `docs/GEOLOGY_FEASIBILITY.md`: "ok let's ship it, make it perfect and make sure nothing breaks". Complete the recommended cut while preserving M8. Codex handles acceptance and release to dev; Claude does not commit, push or deploy.
- M8 archived in `project/tasks/M8_MISSION_RECOMMENDATION.md`. The working tree contains Codex research documentation: preserve it. Baseline protected in `/tmp/analogos-m9-baseline-hashes.json`.

## First checkpoint (read-only)

Read AGENTS, CLAUDE, STATUS, the latest CHANGELOG, ADR-001 through 009, GEOLOGY_FEASIBILITY, research, visual pipeline/context, contracts, web loading and the packager. Confirm branch/HEAD. Return a plan of files, contract, coverage/repair algorithm, downloads and tests **before editing**. Wait for Codex approval. No subagents or parallel work. Then implement in phases A (data/contract) and B (UI/export/package), with Codex review between the two.

## Result and scope

"Geological context" card for the seven current sectors. Real SERNAGEOMIN data distributed by MMA (1:1M) and SEGEMAR (`sigam:e250K_UnidadGeologica`, 1:250K). Understand which units are mapped, coverage/gaps/ambiguity, scale, sources and what to verify. Independent and traceable geological export. Offline, mobile/keyboard, tolerant of absence/error. Does not modify score, confidence, constraints, AI or the M8 recommendation.

Do not include a geological polygon map, lithological filters/requirements, new profiles/regions/score, infrastructure or geological AI. Do not fill gaps with 1M/2.5M; the official viewer may be linked without replacement data. This is the first cut of 20–32 h evaluated.

## A. Pipeline, contract and data

1. Versioned contract for an independent package, e.g. `artifacts/geology-context-v1/index.json`. Science v2/v3 and profiles immutable. Seven site_ids and exact geometries, candidate hash and/or canonical geometry verified in Python/web. Do not inherit percentages to points, subpolygons or different snapshots.
2. Bounded, reproducible public adapters, without credentials. URLs verified in the report; Chile has swapped formats: inspect ZIP and schema, no arbitrary extraction. Real GeoJSON in a resource labeled SHP. Original properties, encoding, query and map date kept separate; CKAN does not date the survey. Unknown map date = null.
3. Argentina: WFS 1.0 GetFeature GeoJSON lon/lat explicit EPSG:4326; pilot bbox or three sectors; limit on features/bytes, HTTP timeout, check numberMatched/Returned. No faulty `resultType=hits`. Reject truncation, incorrect CRS/schema. Do not download the whole country. A source outage does not delete a valid cache/package.
4. Raw ignored with exact request, SHA-256 and acquisition. Validated cache rebuilds without network. A change of request/geometry invalidates the cache. Prepare/validate the complete artifact before replacing. Do not invent retrieved_at when reusing audit; prefer initial fresh acquisition and then cache.
5. Shapely authorized as a pipeline dependency; requests/pyproj existing. GDAL/GeoPandas/Pyshp not needed. Geological APIs only in the pipeline, not the browser.
6. Clip AOI, areas with declared equal-area projection, holes and multipolygons. Group units by source/sheet/code identity. Separate no coverage, covered without conflict, intersection between distinct units and missing description. Duplicates do not increase area; do not force sums to 100 or infer absent categories.
7. Repairs: preserve raw; record IDs, method, area/diagnostics before/after and limitation. Propose a conservative policy of rejecting material changes at checkpoint for Codex review. Engineering threshold is not a scientific standard. Unusable geometry remains unknown with diagnostics.
8. Metadata: original authority/distributor, known layer/sheet/version, scale denominator (NOT resolution in meters), CRS, URL, license/attribution, hashes, query/download date, transformations/limits. CC0 MMA; SIGAM declares CC BY4: record URL and scope of the declaration, without inventing an additional license.
9. States available/partial/no coverage/unavailable define evidence, never suitability. Audit ~99 % CL and 50/0/100 % AR is an independent control, not a hardcoded result. Show any real source change.
10. Meaningful tests: holes, multigeometry, conflicts/duplicates, zero, incorrect CRS/metadata, truncation, corrupt cache/other geometry, failure that preserves previous package, deterministic offline rebuild. Fixtures only in labeled tests; real delivery.

## B. Product/export/portable package

1. Validated optional loading (contract and semantics of finite areas/fractions, reconciliation, IDs/geometry/snapshot, allowed URLs). Absent/invalid shows unavailable and M8 works. No geological providers from the web nor responses from another candidate when the selection changes.
2. Card in existing design; keep globe/map, liquid glass and navigation. Clear Spanish, regional/non-field cartography, honest rounding, coverage ≠ precision/confidence. Unknown/ambiguous visible; units with original description/sources; long names, zero/50/99/100 %, mobile 390px and keyboard.
3. Score geology remains uncalibrated; explain that context does not imply calibrated planetary compatibility. 1M/250K scales visible. Nothing about suitable/safe, traction, grain size or chemical equivalence. Field questions are editorial guidance, not measurements.
4. Own validated JSON export: site/geometry, snapshot, sources, evidence, limits. Accessible button and stable name. Existing M8/candidate exports are preserved; do not silently add fields to their contracts.
5. Packager accepts the new package with explicit list/validation, keeps controls. Repeatable portable ZIP /AnalogOS/ with offline geology. Raw outside the bundle and ZIP. Handle a missing optional package consistently with web loading.
6. Do not modify shared/mission, server/ai, api, workflows, secrets or Vercel. M8 AI keeps prior evidence; document that it does not consume geology yet.

## Acceptance and return

- `project/M9_PROGRESS.md`, ADR-010 proposed, operation/reproduction/sources instructions, STATUS/CHANGELOG. Large ignored data enumerated.
- `source .venv/bin/activate && npm run verify`; identical offline geological rebuild; repeated `npm run release:package` identical; `git diff --check`; baseline intact, do not modify it to pass.
- Codex reviews data/repairs against audit, semantics, loading failures, desktop/mobile/keyboard browser, real export, offline ZIP /AnalogOS/, manual/AI regression and Vercel function. Green tests do not replace review.
- When finished: Owner Codex / Status review; no self-acceptance, commit, push or publish. Report gaps, do not hide them for the sake of "perfection".

## Codex return — fix A before B

Apply docs/CODEX_M9_REVIEW.md: total area change, NaN/invalid structure, raw+artifact transaction on failure after download, provenance tied to acquisition/sector/role and truthful metadata. Reproduction in /tmp/analogos-m9-independent-review.py and /tmp/analogos-m9-provenance-checks.json. Add regressions and return Owner Codex / review. EPSG:6933 overlay approved with consistent documentation. B remains pending; no commit/push.

## Codex checkpoint — reconnection and authorization of B

The five original findings pass the independent review; 120 geological tests and baseline49 intact. Before B, close two additional concrete cases:

1. `publish`: if installing the staging fails and restoring the backup of the SAME pair also fails (even the first one), it currently emits GeologyError "was restored" but target does not exist. Record that failed restoration as PackageStateError, keep the backup and describe the real path/state. Test first and second pair; keep rollback of previous pairs.
2. `check_geometry_dict`: require exact closure of each ring. GeoJSON with four distinct vertices without repeating the first is currently accepted and Shapely silently closes it; reject at acquisition with a CL/AR test. Real data must keep passing.

Then implement full B within the existing scope, without waiting for another checkpoint. Real package recalculated only if content changes. Keep a single contract/semantics in Python without dragging Shapely/pyproj/requests into the packager: separate constants and pure validations from processing if needed, document the already existing jsonschema dependency. Lazy import only if package is present; do not weaken validation.

Compact card in existing design: summary of coverage/gaps/ambiguity, scale and sources; expandable detail with original units and field questions. Independent, self-describing validated geological export, without touching M8 contracts. Optional loading with timeout including body and without affecting selection/M8 when it fails. Web validation of exact geometry and provenance (role/site_id/bbox), fractions/states, allowed https URL.

Update current documentation (README, science/sources/operation) distinguishing available context and uncalibrated score. Verify tests/build/deterministic ZIP/baseline. No commits/push/deploy. Deliver Owner Codex/review; Codex does browser and release to dev. Do not expand scope for unrelated historical gaps.

## Codex closure

Delivery accepted and published, with evidence in `docs/CODEX_M9_REVIEW.md` and `docs/DEV_AI_VERIFICATION.md`. Science and AI core preserved; descriptive context without geological score or geological AI. Do not start another implementation until a new task. The instructions of earlier phases and returns remain as the history of the assignment.
