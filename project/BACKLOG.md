# Executable backlog

## M0 Reproducible repository

- [x] Create root `package.json` with coordinated scripts.
- [x] Create `apps/web` with Vite, React, and strict TypeScript.
- [x] Create `pyproject.toml` and package `pipelines`.
- [x] Implement JSON Schema validation.
- [x] Configure Vitest and pytest.
- [x] Create `.env.example` and installation documentation.
- [x] Verify `npm run build`, `npm run test`, and `python -m pytest`.

**Gate M0:** a new person installs and runs both sides by following the README.

## M1 Demonstrable vertical slice

- [x] Create 3 fixture candidates labeled as `fixture`.
- [x] Create `artifacts/demo/manifest.json`.
- [x] Create `artifacts/demo/candidates.geojson` or equivalent.
- [x] Validate fixtures against the schemas.
- [x] Implement main layout.
- [x] Implement map of Chile with polygons.
- [x] Implement ranking.
- [x] Implement detail sheet with similarity, confidence, and feasibility.
- [x] Implement breakdown by criterion and sources.
- [x] Show banner “non-scientific demonstration data”.
- [x] Build static version with no mandatory external calls.

**Gate M1:** open the app, select three candidates, and explain one in less than two minutes.

## M2 Minimum scientific engine

- [x] Implement weighted geometric mean.
- [x] Implement separate confidence.
- [x] Implement minimum valid weight rule 0.70.
- [x] Implement constraints with traceable reason.
- [x] Tests for score, missing values, epsilon, ties, and exclusion.
- [x] Load the profile from JSON.
- [x] Export `score_breakdown` compatible with the contract.

**Gate M2:** known synthetic cases produce deterministic and explainable results.

## M3 Real data and snapshot

- [x] Test Earthdata and Copernicus.
- [x] Choose exact products and record ADR.
- [x] Create manifest with licenses and checksums.
- [x] Process terrestrial relief.
- [x] Process land cover/exposed soil.
- [x] Build MOLA signature.
- [ ] Incorporate aridity and simplified geology. (aridity ready; geology pending)
- [x] Calibrate available criteria or mark those not calibrated.
- [ ] Generate national grid and top candidates.
- [x] Freeze real snapshot `v1`.

**Gate M3:** 3–5 reproducible candidates exist and no fixture appears as a result.

## M4 Validation

- [ ] Review high, medium, and low results in Worldview/recent imagery. (partial: offline Sentinel-2 context from December 2025 per candidate and observations in `docs/VISUAL_REVIEW.md`; recent imagery and expert review missing)
- [x] Use Atacama as a control.
- [x] Run ±20 % sensitivity.
- [x] Review NoData and limiting resolution.
- [ ] Review sensitive areas and warnings. (permanent water ready; territorial pending)
- [ ] Obtain expert review if possible.
- [ ] Record false positives and corrections.

**Gate M4:** the top 3 has known evidence, limits, and stability.

## M5 Final product

- [x] Replace all fixtures in the final view.
- [x] Comparator for up to three candidates.
- [x] Methodology and source catalog within the app.
- [x] Sheet export.
- [x] Accessibility and error states.
- [x] Optimize loading and geometries.
- [x] Test offline in the presentation browser. (second machine pending)

**Gate M5:** complete flow, public build, and backup demo.

## M6 Delivery

- [x] Final README and chosen license.
- [x] Complete project page.
- [x] Pitch script.
- [ ] Video and screenshots.
- [ ] Attributions and contributions. (attributions ready; team names pending)
- [ ] Links tested in incognito mode.
- [x] Audit/checklist against the official brief.
- [ ] Submit with time to spare and keep the receipt.

## Cutoff rules

- Without M1: do not work on secondary data.
- Without M2: do not add a second profile.
- Without M3: freeze the design and resolve the science.
- Without M4: do not use conclusive language.
- If the demo depends on the internet: replace it with a snapshot.
- AI, SAR and the lunar profile are P1/P2 and are removed first.

## M7 Global AnalogOS — Chile–Argentina pilot

- [x] Visible AnalogOS branding and pilot subtitle.
- [x] Reproducible grid search: 50 windows in two test regions.
- [x] Topographic prioritization, recorded rejections and deterministic diversification.
- [x] Multi-source characterization of up to six windows with v2 formulas.
- [x] Yungay as a known reference, outside the ranking, with the v2 values.
- [x] Catalog of prior work with published coordinates and recorded searches.
- [x] Snapshot v3, extended contracts and v2 preserved.
- [x] Regional map, country filter, record sheet with origin and prior work, export.
- [x] Visual context v3 and `analogos-static.zip` deliverable.
- [x] Codex acceptance (2026-11-14; `docs/CODEX_M7_REVIEW.md`).
- [ ] Territorial cross-check with official layers from IDE Chile and IDERA.
- [ ] Literature review of the Puna with full texts and coordinates.
- [ ] Local validation of the POWER climate context in the Puna.
- [ ] Expand the search to more regions.

**M7 Gate:** the demo shows a documented search, with each rejection explained and without claiming novelty.
