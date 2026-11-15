# M8 — Delivery report for Codex review

Status: **delivered for review** (not self-accepted). No commit or push. Base `4d197e1`, branch `dev`. No new dependencies. Science v2/v3, configs, workflows, `vercel.json` and Vercel protection untouched.

## Corrections from A's review (all with repo regression tests)

1. **Geometry**: only a numerical epsilon of 1e-9°; nearly equal bbox (±0,0005°, ±0,0015°, ±0,002°) → partial coverage without inheriting. Identical decimal (or floating-point noise) does inherit.
2. **Timeout**: the timer covers headers **and** body reading (plus a race against the signal in case a `fetch` ignores it); abort in JSON → `ai_timeout`. Tests: body that is slow, both respecting and not respecting the signal.
3. **Export**: `ai.draft` and `ai.explanation` separated, each with its own provenance, input fingerprint and, for the draft, the original proposal and the user's changes **computed** (edited/removed/added). Editing the brief afterwards breaks the attribution to the AI.
4. **Validation**: `buildMissionExport` rejects (`MissionExportError`) an unconfirmed request, an evaluation from another request or an altered one (it is re-evaluated and compared), foreign fingerprints and out-of-contract selection. `checkSelection` requires a closed, bounded form (`contracts/mission-ai.schema.json`).
5. **Provider output**: validated with Ajv (sent schema + strict contract) before `buildDraft`/`checkSelection`; extras, missing fields and wrong types → `ai_invalid_output`, without normalizing.
6. **Scale and figures**: slope/roughness/relief go to the window only if the quote says "median/regional/full window"; otherwise they are kept as a point scale with a question. Proposed figures must appear in `source_quote` (accepts decimal comma); countries must be named in the quote. Also verified with the real model ("maximum slope of 10 degrees" → point scale).
7. **Destination**: `Otro objetivo / no soportado` with free text; the draft may propose it; Mars is not forced. (I removed `target_stated` from the model schema: Codex's audit calls `buildDraft` without it; the destination is described by the user.)

Independent audit `/tmp/analogos-m8-audit.test.ts`: **9/9 pass**, without modifying it. The two tests added by Codex uncovered two defects in the state, already fixed with regression tests: (a) an AI response from the current `requestId` with foreign fingerprints was ignored and the call stayed "pending" forever → it now ends in error; (b) starting a draft/explanation retry erased the provenance of the result still in use → it is now preserved and a failure does not lose it.

## Codex review B (points 3–6; 1 and 2 already fixed)

- **Single formatting** `mission/format.ts` (deterministic es-CL numbers, without adding precision; °, m, %, km², fraction with its equivalence in %), reused by the engine (reasons and "Required"), the confirmation summary, the result and the printed report. The JSON keeps the canonical unit and exact values (`degree`, `2.3`).
- **Confirmation** (`ConfirmSummary`): shows the effective conditions (e.g. "≤ 2,3° · Full window (~20 km) (essential)"), the requested geometry and a note that the calculation uses those conditions and not the numbers in the brief. Incomplete values are flagged without NaN.
- **Self-sufficient printed report**: table with "Effective condition" (operator, value, unit, scale or "no measurement") even when there are no options; requested and measured geometry in text (requested point/bbox, measured bbox and area, intersections and coverage).
- **Microcopy**: "This version …" instead of "M8" (includes `data_request.note`; the contract's enumeration value `no_adquirido_en_M8` was not touched so as not to change its structure); generic scale "Full window (~20 km)"; hero without a traction promise: "Prioritizes which sectors deserve reconnaissance for a rover trial, with regional measurements and pending field checks. It does not measure traction or approve terrain".
- Changing the reason texts changes the evaluation fingerprints (rules still prerelease); scientific snapshot and contracts unchanged. AI calls were not repeated (only the presentation changed).
- New tests: `missionFormat.test.tsx` (14 cases of formatting, confirmation, report without options, microcopy, hero).

## Stage B (UI) — what is delivered

- "Define a test" / "Evaluate a sector" entry points on the first screen (hero), new "Plan" tab and "Evaluate this sector" button on the sheet. Planner integrated as a section; globe, explorer, v3 search, comparison and method intact.
- Accessible steps (keyboard, 44 px, native controls, focus and announcement per step): describe (objective, brief ≤ 3000, activity, labeled editable example, optional AI with a notice that data is sent to Anthropic, full requirements editor), sector (seven areas with country and REF, point, bbox; coordinates as text with warnings and no NaN; local SVG diagram requested vs measured), confirm (summary, warnings, explicit confirmation), result.
- Result: verdict, groups by status with blockers visible without opening anything, detail per criterion (required/observed/scale/period/evidence with link), sector measurements, labeled original values, partial comparability, ordering rule, field checks, pending items, insufficient-evidence report with planned sources, validated JSON and printable report (full brief, requirements with origin and quote, geometry, limits, provenance).
- Pure state `mission/plannerState.ts` (reducer used by the UI): editing the brief, requirements, sector, destination or activity clears confirmation and result and cancels pending AI (the `fetch` is aborted); late responses are ignored by `requestId` and fingerprints; an edited requirement is no longer listed as "AI". No `localStorage`; "Clear all" available.
- AI: friendly errors, manual mode intact; in the ZIP (no function) it fails clearly (no endless spinner: 45 s timeout and cancellation).

## Verification performed

- `source .venv/bin/activate && npm run verify` → exit 0: **177 Python**, **196 web** (+2 skipped: real AI), `tsc -p tsconfig.server.json` included in `verify`, build.
- `npm run release:package` **twice**: identical ZIP, 30 files, 12.983.416 bytes, SHA-256 `7b2b30b578e428ea76d8e9998a994935853dd0b50c850771d0b9dabac7a8d2ec` (`shasum -c` OK). No `sk-ant`/`ANTHROPIC_API_KEY`/`x-api-key` in the content; no `api/` or `server/`.
- Baseline `/tmp/analogos-m8-baseline-hashes.json`: 38 files without differences; `git status` unchanged in `artifacts/`, `config/`, `.github/`.
- `git diff --check` clean.
- **Real AI** (`npm run test:ai-live`, `claude-sonnet-5-5`, harmless inputs, no secrets), latest run after the changes:
  - draft `req_011Ch3SU1U1WP9u5CNUGtJve` · 2026-11-14T20:19:36.481Z · 2161 in / 1033 out · `end_turn`;
  - explanation `req_011Ch3SUb9ZCuGKimh1dmVKC` · 2026-11-14T20:19:40.585Z · 6174 in / 569 out · `end_turn`;
  - maximum slope case `req_011Ch3SUtmi2ZccExEUrdjvf` · 2097 in / 696 out → point scale + 1 question;
  - the full export with both real records validates against the contract.
  - Tested via handler and local Vite server (`dev` and `preview`); **not on Vercel**.

## Honest limits and risks

- **New Vercel not verified**: compilation of `api/ai.ts`, JSON tracing in the function, maximum duration and environment variables are left for the preview that Codex reviews. Nothing was published and no remote secrets were touched.
- **No browser automation**: the interface was verified with state and rendering tests (`renderToStaticMarkup`), not visually; responsive design, focus, real printing and contrast need your CUA.
- The `Origin` check is not authentication; the limiter is in memory and per instance.
- The AI draft may change the scale of a topographic metric to "point" (deliberate, conservative behavior); the user can return it to "window" in "More options".
- `explain` sends ~6 k input tokens; the explanation remains only a selection of references, per ADR/Codex decision.
- The two flows share the editor and result; the sector flow without requirements evaluates with everything "prioritized" (a warning is shown in the confirmation step).

## Main files

Core `apps/web/src/mission/*`; UI `apps/web/src/components/planner/*` (+ `App.tsx`, `CandidateDetails.tsx`, `LiquidNav.tsx`); server `server/ai/*`, `api/ai.ts`, `tsconfig.server.json`, plugin in `apps/web/vite.config.ts`; contracts `contracts/mission-*.schema.json`; tests `apps/web/src/tests/{missionEngine,missionGeometry,aiServer,plannerState,plannerUi}.test.*` and `aiLive.test.ts`; docs `docs/AI_SETUP.md`, `ARCHITECTURE.md`, `PRODUCT_AND_SCIENCE.md`, `DEMO_ACCEPTANCE.md`, `README.md`; `.env.example`, `package.json`, ZIP and checksum regenerated.

## Reproduce

```bash
source .venv/bin/activate && npm run verify
npm run release:package          # dos veces: mismo SHA-256
npm run test:ai-live             # llamada real; requiere ANTHROPIC_API_KEY en el .env ignorado
npm run dev                      # o: npm run build && npm run preview  (ambos sirven /api/ai)
```


## Review closure — Codex (2026-11-14)

**Accepted locally.** The handoff and the earlier hashes document Claude's delivery; the current evidence is in `docs/CODEX_M8_REVIEW.md`. Codex also fixed the formatting of tiny thresholds and the coverage label, verified 177 Python + 196 web (2 real tests skipped by default), typecheck/build and independent audit 10/10. real AI verified from the browser, desktop/mobile/keyboard, exports and manual walkthrough of the ZIP under `/AnalogOS/` without the AI service.

Final ZIP: 30 entries, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`. Repeated packaging identical and 38 baseline hashes intact. Capture `submission/assets/analogos-m8-review.png`. Delimited pending items: remote Vercel test and visual inspection of the native print dialog; not a terrain certification. No commit or push; Claude awaits a new assignment.
