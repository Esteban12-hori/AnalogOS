# Codex Review of M9

Status: **accepted and published to dev**, with geology and both AI operations verified from the browser.

## Review A — 2026-11-14

Real data consistent with the audit, 71 existing geological tests correct. Five independent cases reveal gaps that must be fixed before B:

| Priority | Reproduced evidence | Required fix |
|---|---|---|
| P1 | MultiPolygon with two copies of the same square: the repairs match, the total area drops 50 %, and `_diagnose` accepts it. | Apply the total original/repaired change limit in addition to the symmetric difference. |
| P1 | An internal NaN coordinate passes `parse_features` because the bounds remain finite. | Validate structure and all vertices before Shapely and before installing the cache. |
| P1 | Refresh with a Point in the Chilean layer: the build fails, it keeps the previous artifact but replaces the valid cache. | Raw+artifact transaction with full validation in staging and rollback; truthful messages. |
| P1 | An Argentine site can cite request_ids from another Argentine sector and pass the validator. | Link acquisition, site_id, exact bbox and source role. |
| P2 | A Chilean site can cite only CKAN metadata instead of the geometry download. | Require its layer acquisition; metadata may be additional. |

Independent reproductions: `/tmp/analogos-m9-independent-review.py` and `/tmp/analogos-m9-provenance-checks.json`. Incorporate permanent regressions.

Other adjustments: validate name/symlink before opening cache files; check the CKAN license before attributing CC0; describe only formats actually inspected in that acquisition; correct SIGAM to «Sistema de Información Geológica Ambiental Minera»; align every description of the method with the code.

## Approved technical decision

Codex approves the full overlay in EPSG:6933 after validating/repairing the originals. It makes the partition additive and differs from the exploratory audit by less than 0,00005 percentage points. Keep the original audit and document the straight edges in the plane, without claiming an exact geodesic integral.

Independent control of seven AOIs: maximum relative difference between projected/geodesic area 5,13e-7. Four real invalid geometries: symmetric differences clipped between make_valid and buffer(0) equal to zero. That does not remove the rejection of other materially different cases.

## Pending acceptance items

Fix A, review B (sheet, export, errors and package), desktop/mobile/keyboard browser, offline ZIP /AnalogOS/, M8/AI regression and dev. The packager currently rejects the new JSON because B is pending; do not publish A separately. Science, images and AI core protected by a baseline of 49 files.

## Review of corrections — reconnection

Codex repeated the three adversarial geometry/transaction cases and the two provenance cases: 5/5 correct. 120 geological tests pass and the 49 hashes remain intact. Code review detects two additional edge cases, assigned to Claude before B: restore failure of the same pair in `publish` wrongly reported as restored; unclosed GeoJSON ring silently accepted by Shapely. They do not affect the current real data, but must be closed before release.

## Local acceptance of A and B — Codex, 2026-11-14

- Independent review of code, contract, geometries, provenance and error recovery; five initial findings and two later edge cases fixed. The 49 protected science/visuals/profiles/AI core files retain their hashes. The geological data match the exploratory audit within 0,00005 percentage points.
- `source .venv/bin/activate && npm run verify`: 316 Python, 246 web correct; two opt-in real AI tests skipped. Server typecheck and build correct. New sheet tests preserve the snapshot and the historical «Sin calibrar» (not calibrated) status.
- Final Codex adjustments: minimum geological text 12 px and more comfortable controls; understandable loading messages; download status reset when changing sector; visible warnings distinguish already available cartography from compatibility still uncalibrated. Snapshot, scores and previous exports intact.
- Repeated ZIP identical, 31 entries and 13.221.264 bytes; SHA-256 `eed868335c5374d20b05415a8627be9ec3f035c1dc10668bbe08f21e03f6520c`. Each entry matches dist. No raw/credentials/research in the ZIP.
- Real browser on the ZIP extracted under `/AnalogOS/`, with external connections blocked: globe loading, geological sheet, states of Chile ≈99 % and Argentina 50/0/100 %, details accessible with Enter. Mobile 390×844 without horizontal overflow (document width 390; geological sheet 326). Screenshots in `submission/assets/analogos-m9-review.jpg` and `analogos-m9-mobile.jpg`.
- Missing geology (404) and invalid geology (Argentine sector citing another's acquisition) show «not available». Without geology, the complete manual example prioritizes four of seven areas and retains unknown traction and pending feasibility.
- Real download in Chrome of `cl-win-s2500-w06970-geology-context.json`, validated in Python and identical to the subset rebuilt from the package. Evidence in `submission/evidence/m9-geology-export.json`. The download observer was not used; the file saved by the browser was read.
- The initial browser test mistakenly used a QA CSP that blocked `unsafe-eval`, required by the existing Ajv. Only the temporary QA server was corrected, keeping `connect-src self`; the product CSP was not changed. The initial opening also lagged in the driver; this is not attributed to the app code.

The acceptance covers implementation and traceability of regional cartography. It does not validate the terrain, does not calibrate the geological criterion, and does not enable geological use in AI. The verified hashes link candidate and request files; they are not a signature of authenticity and do not by themselves prove each calculated area. The spatial cross-check was carried out against the sources and the audit.

## Publication and remote regression — Codex, 2026-11-14 (America/Santiago)

**M9 completed and published to dev.** Code `34e76b9734efab2428013a13c6d0defb8d85d8f4`, Actions correct: https://github.com/Esteban12-hori/AnalogOS/actions/runs/43658989969. Deploy https://analogos-nmyfr42k8-pruebas-730d0f41.vercel.app, alias https://analogos-dev.vercel.app/. The subsequent checkpoint adds only documents/evidence with `[skip ci]` and retains that deployed code. Main did not change.

- The function as actually packaged passed the startup check (modules/snapshot/contracts, GET 405 and POST without key 503). Vercel protection and credential configuration were maintained.
- Geology in dev: Chile 99,4 %, Argentina 100 % and Yungay reference 99,1 % observed; units and scale correct. Argentine export downloaded and validated, identical to the one rebuilt from the package: `submission/evidence/m9-dev-geology-export.json`.
- Real AI regression: synthetic brief with regional median slope ≤ 2,3°, non-vegetated preference ≥ 95 %, permits pending. Anthropic proposed three editable requirements; explicit confirmation and evaluation prioritized one of seven areas. The explanation highlighted existing reasons without altering numbers or exclusions. Permits and feasibility remained pending.
- AI JSON downloaded from dev, contract validated and evaluation recalculated identically; full rebuild with `buildMissionExport` also identical. Evidence: `submission/evidence/m9-dev-ai-export.json`.
- Draft: `claude-sonnet-5-5`, `2026-11-15T00:38:32.854Z`, request `req_011Ch3nDHnwnQR73oKU4vndZ`, tokens 2177/1010, `end_turn`.
- Explanation: `claude-sonnet-5-5`, `2026-11-15T00:39:27.098Z`, request `req_011Ch3nHb48fJE7MMfz5V45L`, tokens 5792/460, `end_turn`.
- Screenshots: `submission/assets/analogos-m9-dev.jpg` and `analogos-m9-dev-ai.jpg`. The AI continues to use exclusively the M8 engine/evidence; it does not consume the new geological context.

Accepted by Codex after reviewing Claude's implementation and correcting the final presentation. Claude has no new assignment. No claim is made of field validation, absolute accuracy or universal absence of defects; the tests cover the M9 scope and its observed regressions.
