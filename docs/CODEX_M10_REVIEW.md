# Independent M10 Review — Codex

**Status: accepted by Codex, published on dev and verified remotely.** Implementation by Claude, feedback from Codex and corrections completed. Authorized scope: guide trials with official geology; without modifying evaluation, score or scientific data.

## Reviewed result

- Anthropic receives the confirmed objective and official units/sources. It only selects unit+check pairs from a validated catalog; fixed editorial phrases, without inventing measurements. Coverage, scale and overlap limits are always visible. Discarded sectors are not reinstated; Yungay keeps REF.
- Server and browser bind the selection to the request, evaluation, full context and exact subsets. Stale/foreign responses are rejected. Missing or invalid geology preserves the requirements flow; optional AI with explicit recovery.
- New wrapper with the M8 export intact, sources, geometries, selection and provenance. Independent audit of the content and recalculation with snapshot; subset fingerprint verifiable. The identity of the complete package is declared if it is not included. These hashes allow verifying consistency; they are not signatures or certification of authenticity.

## Codex review and tests

The three initial repros are now rejected: geometry shifted 0,01°, altered source URL and AI selection with an invented sector. The valid case passes. Purpose limits, requested/measured geometry, statuses and M8 preservation were reviewed. The builder requires context validated against official candidates.

- Claude's supervised verification: **316 Python, 332 web**, three real opt-in tests skipped by default; typecheck/build correct (`/tmp/m10-verify2.log`, final round). The final CSS correction passed build and snapshot validation.
- Two final contrasting real queries in `submission/evidence/m10-live-geology-evidence.json`: mobility 12 references and sampling 12 (final round), with different purposes. No calibrated scientific quality or model determinism is claimed.
- Real local browser: mobility explanation with geological context, three valid references (Qa/PE3i), traction pending. Download in `submission/evidence/m10-local-geology-export.json`, validated and rebuilt identical with official context/snapshot. Request `req_011Ch3rc6KyhKhPmVZ2CHY4t`, model claude-sonnet-5-5; 6514/313 tokens; end_turn.
- Historical M8/M9 reports continue to validate and rebuild. Session audit scripts: `/tmp/analogos-m10-independent-review.mjs`, `/tmp/analogos-m10-validate-exports.mjs`.
- ZIP browser under `/AnalogOS/`, external connections blocked by CSP: evaluation/context/export work; unavailable AI is reported and the result is preserved. Sector AR-5 shows 0 % and no unit. Routes with absent and invalid package keep evaluation and explanation without geology.
- Mobile **390 × 844**, Enter key in details; URL overflow with `overflow-wrap:anywhere` was detected and fixed. Final verification: document width 390, with no geological elements outside the width, new content ≥12 px. Screenshots in `submission/assets/analogos-m10-local.jpg` and `analogos-m10-mobile.jpg`.
- **33 unique protected files intact**: science, geology, profiles, evaluation and historical ZIP; 24 baseline entries +11 complementary ones with duplicates. Code/evidence/bundle/ZIP reviewed against local credentials, with no matches.
- Final ZIP repeated identical: **31 entries, 13,255,407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`.

## Limits

Traction, soil mechanics, planetary suitability and permits are not measured. Coverage remains the seven-sector pilot; there is no new data/candidates. The AI prioritizes checks; it does not add a geological score. The real Vercel function, AI on dev and downloaded export were verified; details in `docs/DEV_AI_VERIFICATION.md`.

## Original findings — resolved

  (repro: node /tmp/analogos-m10-independent-review.mjs)
1. Wrapper: shifting the longitude of all vertices of the CL1 geological export +0.01 still validates even with the real {bundle}. It must compare geometry and site_id/geodata with bundle candidates; the catalog/selection must bind complete evidence, not just a brief that omits geometry. The declared identity of the complete package does not verify the bytes of the subset.
2. Changing source.dataset_url to another permitted URL on the same host still validates without modifying the catalog. Citations/origin/metadata/raw/geometry omitted from the catalog hash remain tamperable without detection. Add an explicit independent fingerprint of the exact subsets included, bound to the catalog/record, reconstructible without the whole package (do not call it a full hash). Prefer deriving the same normalized subset identity server/browser/export. Keep the honest declaration that the full hash of the subset cannot be verified.
3. mission_export.ai.explanation.selection.options[0].site_id='inventado' still validates in the wrapper with a real bundle. Reuse buildMissionExport to rebuild from request/eval/bundle+ai and compare in full; without a bundle, at least checkSelection/draft/explanation/user_changes fingerprints. The M8 JSON Schema is not enough to claim a coherent export. validateAnyMissionExport with a bundle must also audit M8.
Other points to check when finished:
- roots(opts.root) falls back to repo if explicitroot is empty; optional isolation must be real.
- loader cache only keys on root, ignores bundle change. Bundle identity key for tests/publicAPI; immutable runtime bundle documented.
- script check-vercel-function must test the FUNCTION's geology and not find a checkout file via original cwd/ancestors; isolate a copy in /tmp+chdir and restore. No network/key. IncludeFiles both context and candidates bytes.
- keep original fractions (do not round to a0/1enprompt) and explain which fraction includes overlap; unit not located if hint partial. Show original source href.
4. UI GeologyGuidance does not link any source: it prints dataset_name/authority, but the source brief omits dataset_url. Add a visible official link with description, URL printout, bound to the catalog and export (point 2).
5. UnitBrief.fraction is fraction_including_overlap and the UI simply says «% of the sector». Show that it includes overlap/do not add up unit percentages; include fraction_unambiguous and offer data without double counting and a clarification. The prompt rounds to 4 decimals turning non-extreme values into 0/1, avoid aggressive rounding that hides small percentages.
6. Product: AiPanel says «not the full text of the brief» while the default checked box sends the brief; use a single clear conditional notice. Remove M8 jargon in visible texts «M8 query»/«what M8 describes»; say requirements explanation without geology. Place the AI action before the long geological block or give clear access, so as not to hide activation after 7 cards.


Claude's initial real test: mobility and sampling produce different selections. It does not replace review of integrity, sources and browser.


## Vercel checks and isolation fix

Attempts `ab13fb8` (Actions 43664379073) and `e0e6f1c` (43664642031) built correctly, but halted publication when checking the isolated function: traced files were missing when copying only the .func directory. First the case of links was covered (real local repro); the second check showed that was not enough. Vercel also keeps files outside .func and declares them in filePathMap. Its official code resolves them against the build directory: https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/build/index.ts. The check now materializes only those declared entries, with paths bounded to the project and the package, before isolating it; it does not fill in absences on its own. Fixtures with a link and with filePathMap were checked: the previous check fails and the corrected one passes, preserving the absence/corruption cases. None of the failed attempts changed the dev alias. The third check passed in Actions 43664952053 (1ac15e3), with two filePathMap entries materialized and all negative cases correct.

## Reliability observed on dev and round 3

Two AR6 queries in the first M10 deployment were rejected without altering the result. Local reproduction: valid M8 selection, six geological references from the same sector against the cap of three. Claude fixed it under a new assignment from Codex: explicit effective budget and a single new call upon invalid selection, without trimming or accepting incorrect responses. The total deadline is preserved and the provenance is that of the accepted response (it does not include consumption of the discarded attempt). 316 Python/332 web, typecheck/build correct; three valid real local AR6 queries. Reviewed and accepted by Codex. Current ZIP: 31 entries, 13,255,407 bytes, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`. The final remote check passed; see the following closure.

## M10 — publication and final remote verification (Codex, 2026-11-14 America/Santiago)

**Completed, reviewed and published on dev.** Implementation by Claude under assignment; review, feedback, corrections and acceptance by Codex. Code `4708b42b4bd152dca74d3e009f233a910e458d8b`; [Actions correct](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43665786554); [dev](https://analogos-dev.vercel.app/); deployment https://analogos-5plfynboc-pruebas-730d0f41.vercel.app. The later documentation checkpoint uses `[skip ci]` and preserves this deployed code. This delivery did not modify main, secrets or Vercel protection.

- The real Vercel function passed the isolated check: two filePathMap entries materialized; snapshot/contracts/geology load and validate; absence/corruption cases correct before publishing.
- Real test from Chrome on dev, sector AR6 (`ar-win-s2580-w06710`), synthetic mobility/geological reconnaissance brief, regional slope ≤9° and non-vegetated preference ≥95 %. The only sector evaluated was prioritized; traction and territorial feasibility pending. These are demonstration thresholds, not operational recommendations.
- Anthropic chose three valid references: characterize surface material in the Galán volcanic complex and alluvial/colluvial deposits, plus check map–terrain correspondence of the first. Source SEGEMAR 1:250.000, coverage 100 %, limits and official link visible. No change to evaluation, values or ranking.
- Downloaded export: `submission/evidence/m10-dev-geology-export.json`. Validated with `validateAnyMissionExport` and rebuilt identical with `buildMissionGeologyExport`, snapshot and official context. Screenshot: `submission/assets/analogos-m10-dev.jpg`.
- Provenance: model `claude-sonnet-5-5`, `2026-11-15T02:02:57.957Z`, request `req_011Ch3teqxMdwPrJqPCngjWE`, tokens 6795/719, `end_turn`. This evidence proves the accepted response; it does not record whether the internal retry was required nor add its consumption.
- Final verification: **316 Python, 332 web**, typecheck/build correct. Two final contrasting real objectives: mobility and sampling, 12 valid references each, different purposes (`submission/evidence/m10-live-geology-evidence.json`). Three local AR6 queries correct; M8/M9 regression and integrity repros correct; 33 protected files intact.
- Current ZIP: **31 entries, 13.255.407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repeated identical. Local QA offline/subfolder/absence of geology/mobile 390px/keyboard documented in `docs/CODEX_M10_REVIEW.md`; the latest modifications only add server recovery and shared typed rejection reasons, without changing the flow or the data.

Before this publication, the model exceeded the cap of three references per sector in AR6. The rejection was maintained and a single second call was added with a controlled reminder, same facts and full validation, within the total deadline. If it fails again, the app keeps the manual result. Caps are not raised and the output is not trimmed. The initial packaging failures were resolved before updating the alias.

Limits: seven pilot sectors; reconnaissance guidance, without field geological validation, lithological score, measured traction or access authorization. In M10 the explanation with geology was tested remotely; the remote test of draft generation remains as an M9 precedent, and no new execution is attributed to M10. Native print inspection is still pending. Claude is left without a new assignment.
