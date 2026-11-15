# Codex Review — Explore/Mission Integration

Date: 2026-11-15 (America/Santiago). Base reviewed: `dd625b4626bb39a0f920eca816b6353c25667203`, branch `dev`. Integration by Gus/Claude, review and correction by Codex under the direction delegated by Dan.

## Verdict

**Integration accepted for the pilot, with the bounded pending items below.** ADR-013 and ADR-014 accepted. Yungay is kept as a known alternative in Mission and outside the discovery ranking. There are no changes to formulas, data or AI server behavior.

The base integration was published successfully in [Actions 43678787020](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020). The correction is published at **`9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`**, [Actions 43681551867 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), including the function and alias. The full walkthrough was repeated from a fresh dev tab: preserved sector, real draft, confirmation, evaluation, explanation and real geology. Final validated/rebuilt evidence: `submission/evidence/integration-final-dev-geology-export.json`; provenance in DEV_AI_VERIFICATION. The later documents/evidence checkpoint uses `[skip ci]`.

## Real AI from the integrated interface

Chrome was used with an authorized Vercel session at `https://analogos-dev.vercel.app/`. No secrets or protection were changed. Synthetic brief explicitly labeled, with no personal data: regional rover mobility reconnaissance and AR6 geological context, regional median slope ≤9°, non-vegetated preference ≥95 %, traction/safety/permits/access pending field verification. These are test thresholds, not operational standards.

1. "Propose requirements with AI" returned **6 unconfirmed requirements**: two measurable and four without measurement. The interface allowed reviewing them and required confirmation before evaluating. The proposal asked whether the pending items were essential or preferences: the user must review this; it is not field authorization.
2. The AR6 window was explicitly selected in the scope step. The only sector evaluated was prioritized for reconnaissance, with **1 of 5 preferences and 4 without data**. Similarity v3 49,43, regional slope 3,563° (presented according to the view), without recalculating the snapshot.
3. "Highlight reasons with AI", with geology enabled, actually responded from Anthropic. It selected calculated evidence and **three valid geological references**: characterize surface material of the Galán volcanic complex and of alluvial/colluvial deposits; check map–terrain correspondence for Galán. The UI shows SEGEMAR 1:250.000, full coverage, official links and limits. Coverage is not accuracy or suitability.
4. `submission/evidence/integration-dev-geology-export.json` was downloaded. `validateAnyMissionExport` accepted it without issues and `buildMissionGeologyExport` rebuilt it identically with the official snapshot and context. This cross-checks the calculation and fingerprints; it does not validate the terrain or the scientific accuracy of the sources.

| Operation | Provenance of the accepted response |
|---|---|
| Draft | `claude-sonnet-5-5`, `req_011Ch49r2xSqLrAHSpZDFz6w`, `2026-11-15T05:22:19.635Z`, 2229 input tokens / 1842 output |
| Explanation and geology | `claude-sonnet-5-5`, `req_011Ch49vXptJHdQhMzJSRTMq`, `2026-11-15T05:23:11.255Z`, 7536 / 374 tokens |

Both responses ended in `end_turn`. The provenance records the accepted response; it does not allow inferring whether there was an internal retry or its consumption. Screenshot: `submission/assets/analogos-integration-dev.png`.

## Regression found and fixed

**Repro:** Explore → AR6 → "Evaluate this sector" → type in the dock → "Send". `submitBrief` imposed `journey: test`, whose reducer resets `scope.mode: catalog`. The user went from one window to seven without asking for it. It was observed in dev before fixing.

**Change:** initialize the journey only when it is `null`; if it already exists, keep it together with its geometry. The reducer still invalidates an evaluation when the brief changes. No evaluation or AI call is made automatically.

**Test:** case added to `MissionController.test.ts`, first red (scope `catalog` instead of `sector`) and then green; it verifies, up to the evaluation, that `options` contains exclusively AR6 and that there were no AI calls. In the local build (port 4188), the same walkthrough kept "Evaluate a sector" and the AR6 name after Send.

## Yungay and acceptance of the ADRs

- **Explore:** six candidates, Yungay REF separate, with no discovery rank.
- **Mission:** meets ADR-009 §5: the known reference can be useful for a trial run. Its evaluation is kept and, if it qualifies, its place among the evaluated alternatives, always with REF. The candidate headline excludes it and reports it separately. Do not modify `shared/mission/evaluate.ts` or fabricate a second exclusive ordering for the UI/export.
- **ADR-013:** accepted after cross-checking a single engine and the real AI/export path. The decision on REF and on preserving scope when sending the brief is explicitly added.
- **ADR-014:** accepted as the pilot architecture. Reviewed on desktop and at 390×844:, the S2 sheet allows opening Reading and Your mission with the same evaluation/AI. It does not certify real Safari/iOS.
- `CLAUDE.md` now references ADR-006/007/014. The integration and distribution plans are marked as background, without activating new assignments.

## Verification and invariants

- `source .venv/bin/activate && npm run verify`: **333 Python**, **784 web**, 3 web cases skipped because they are opt-in; server types and build correct. The base revision had 783 web; the new case reproduces the loss of scope. The five additional Python tests compared with Gus's report have local data available here and are not skipped.
- `python scripts/package_release.py`: **73 entries, 14.792.109 bytes**, SHA-256 `d977f0adf4f9e7e3d2ee4e9b780ee7f00d7124def36b24e1369a7270e8e12393`. ZIP checksum and CRC correct.
- Comparison `e074762..dd625b4` empty in `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, root `package.json`, `package-lock.json`, `apps/web/src/mission/` and the artifacts `science-v3`, `geology-context-v1`, `visual-context-v3`. Those paths are also not edited in this correction. The build script of `apps/web/package.json` did change during the redesign; do not claim that all package.json files are identical.
- main, credentials, provider scopes and scientific data are not modified. The pre-existing `outputs/` remains excluded from the delivery.

## Specific pending items

1. Direct navigation "Go to Reading" from the mobile popover: remains as guidance text. Verified alternative: Profile → Reading. Requires unifying the action between the left panel, the intermediate rail and the sheet tab.
2. GIBS tiles without network: the limit documented by Gus remains; local images are the fallback. Its network-blocking test was not repeated in this review.
3. Native printing with `PrintGeology`: the content has render tests, but the attempt to open printing with Chrome automation timed out on interaction and did not allow inspecting the output. **Pagination and the PDF are not declared validated.** Nothing was sent to a printer.
4. Gestures, virtual keyboard and Back navigation on a real iOS device remain pending; size emulation in Chrome does not replace them.

These are pilot acceptance limits, not evidence of field validation. There is no new task assigned to Claude.
