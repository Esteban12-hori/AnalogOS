# M10 — Progress and closure (Claude → Codex)

**Current status:** completed, reviewed and published/verified in dev by Codex (4708b42). The following rounds are implementation history. Closure and final evidence in docs/DEV_AI_VERIFICATION.md.

## What was delivered

- **Shared core** `shared/geology/`: `context.ts` (M9 validator moved, single copy; `apps/web/src/domain/geologyContext.ts` now re-exports), `guidance.ts` (closed catalog, selection, view, fingerprints), `aiSchema.ts`, `exportWrapper.ts` (wrapper + validator + format detection).
- **Server**: `server/ai/geology.ts` (loads/validates the official package + SHA-256 of candidate bytes), `handler.ts`/`operations.ts`/`prompts.ts` (opt-in channel, 409 errors before the key and the provider, own schema/prompt/`max_tokens` only with the channel), `nodeAdapter.ts`.
- **Web**: `GeologyGuidance.tsx` (section + printing), `ResultView.tsx` (opt-in checkbox with a notice of what is sent, retry without geology, export button with geology), `usePlanner.ts`, `plannerState.ts` (separate geological record), `aiClient.ts`, CSS.
- **Contracts/ops**: `contracts/mission-geology-export.schema.json` (new; the M8 and M9 ones untouched), `vercel.json` (bounded `includeFiles`), `scripts/check-vercel-function.mjs` (exercises bundled geology, absence and corruption in isolation).
- **Docs**: ADR-011 (proposed), `docs/AI_SETUP.md`, `docs/GEOLOGY_CONTEXT.md`, ADR-010 (supersession notes), STATUS, CHANGELOG.

## Local decisions (reversible; review)

1. Caps of 3/sector and 12 total are **hard**; no justification field (avoids free text). If Codex wants "more quota with justification", it requires a closed field.
2. Only evaluated and **non-discarded** sectors receive references; discarded ones appear with their reason.
3. The geological checkbox is **checked by default** when the context is available; the text next to it states that the objective (brief) and public cartography are sent. Change to unchecked if strict per-session opt-in is preferred.
4. `max_tokens` 6000 with the geological channel (2000 was truncated in the real test with the current model, which also reasons before answering).
5. Numerical noise tolerance 1e-8 (that of `available`) for gap/overlap: sector AR-6 has 1e-15 of overlap in one unit.
6. Export with geology is a **second button**; "Download JSON" still emits exact M8 1.0.

## Verification performed

```sh
source .venv/bin/activate && npm run verify   # 316 Python; 314 web (+3 omitidas: reales opt-in); typecheck servidor, build
npm run release:package                        # repeated identical
git diff --check
ANALOGOS_LIVE_AI=1 npm -w apps/web run test -- src/tests/aiLive.test.ts -t "orientación geológica" --silent=false
```

- Web: 314 pass (previously 246): `geologyGuidance` (39), `aiGeology` (16), `plannerGeology` (13) and the existing ones untouched. Python unchanged (316).
- ZIP: 31 entries, 13.246.742 bytes, SHA-256 `b2153f69c07be2edc1980c86d7d3eab6b8839b3556c0b244b6b618f8988a1b44`, repeated identical; no `sk-ant` in the bundle. Baseline `/tmp/analogos-m10-baseline-hashes.json` (24 entries) intact; `artifacts/` unchanged.
- **Real AI (2026-11-14)**, two contrasting objectives with the real package: mobility → 10 refs (`caracterizar_material_superficial`, `resolver_ambiguedad`, `verificar_hueco…`, `correspondencia…`), sampling → 12 refs (almost all `diversidad_litologica_muestreo`); distinct and valid selections (`differs: true`). Request IDs `req_011Ch3qnoRvrnHh2fbbzHiML` and `req_011Ch3qogrowSADrgjvx6T5K`; ≈25.300 input tokens and ≈1.850 output tokens each. The first real test failed due to truncation (`max_tokens`): fixed and covered by a test.
- Bundled function: **emulated** (tsc CommonJS to `/tmp/m10-fn/api.func`, files copied as `includeFiles`): GET 405, POST without key 503, geology included and validated (409 with a foreign fingerprint, 503 with the correct one), absence and corruption in isolation → `geology_context_unavailable`; removing the candidates makes the script fail.

## Honest gaps

- **There is no real `vercel build` here** (no CLI/token): it was not verified that Vercel accepts the brace glob of `includeFiles` nor the real file layout; the CI step "Check startup of the bundled function" exercises it before deploying and will fail if anything is missing. Codex should check it on the first deploy.
- No browser QA (desktop/390 px/keyboard/offline/download): only SSR rendering and state tests. The new UI uses ≥12 px and native controls, but it was not seen on screen.
- The AI response by itself includes sectors that M8 would highlight anyway; the scientific quality of the selection is not measured. There is no field validation or planetary equivalence validation.
- The web does not compute SHA-256 of bytes; the wrapper declares the identity of the full package without being able to recompute it.
- Large prompt (≈25 k input tokens) per query with geology; not optimized.
- New large/unversioned files: none. `submission/analogos-static.zip` and its `.sha256` were regenerated (the bundle changes).

## Round 2 — corrections from `docs/CODEX_M10_REVIEW.md`

- **Wrapper integrity**: the catalog includes `subset_fingerprint` (SHA-256 of the canonical JSON of the exact `geology-export` subsets of the sectors used: geometry, units, source, citations, requests, metadata); it goes in `catalog_fingerprint`, in `context_identity` and in the declared catalog, and is recomputed on validation without the full package. `context_fingerprint` remains the declared identity of the full package (not verifiable from the file). With `bundle`, each subset is anchored to the snapshot candidates (exact country, name and geometry: `validateGeologyExport(data, candidate)`). The builder requires `{ bundle }`, validates the context with `parseGeologyContext` against those candidates and audits the embedded M8.
- **Embedded M8**: `auditMissionExport` rebuilds with `buildMissionExport` (request + snapshot + AI records) and compares in full when there is a bundle; without a bundle it checks contract, fingerprints, `checkSelection`, brief/proposal fingerprint and `user_changes`. `validateAnyMissionExport` also applies it to the standalone M8 1.0 (the real M9 export remains valid).
- **Repros** `/tmp/analogos-m10-independent-review.mjs`: now all three are rejected (geometry ≠ candidate; subset/catalog/guide fingerprint; "Sector foreign to the evaluation: invented").
- **Other edge cases**: explicit `root`, including the empty string, truly isolates; loader cache with bundle identity; `check-vercel-function.mjs` copies the function to a temporary directory outside the checkout, runs from there and restores the cwd.
- **UI/prompt**: clickable official source (https) and URL printed in the printable version; each unit shows % including overlaps and % without overlap, with a notice that they do not add up and that the map does not locate units within the sector; the prompt sends unrounded fractions (plus without overlap and overlap), source URL and limits; single and conditional sending notice depending on the checkbox; no visible "M8" jargon; the AI action goes before the geological cards.
- **Final real AI** (prompt/schema changed): `submission/evidence/m10-live-geology-evidence.json` (synthetic inputs, public data, selections, provenance, fingerprints; no keys): mobility 8 refs (`caracterizar_material_superficial` + gap), sampling 10 (`diversidad_litologica_muestreo` + gap), `differs: true`. Request IDs `req_011Ch3rSGCXCzpqhztrctMGL`, `req_011Ch3rT5D1Kw8W69qRKNZww`.
- **Verification**: `npm run verify` to `/tmp/m10-verify.log`: 316 Python, 325 web (+3 skipped), typecheck/build OK. Repeated ZIP identical: 31 entries, 13.255.254 bytes, SHA-256 `22b327cc622abadbb54c16358a750a1eb3c6a85033500294ad91310b18a470bb`. Baseline 24 + supplement 11 intact; `git diff --check` clean.
- **Remaining gaps**: no real `vercel build` (emulated function; the brace glob of `includeFiles` unverified on Vercel) and no browser QA. Without a bundle the subset geometry cannot be anchored to the snapshot (only internal consistency). The M8 provenance in deterministic mode is self-declared.


## Codex final visual review

Fixed URL overflow on mobile with overflow-wrap:anywhere; does not change contracts/AI. Final ZIP and evidence in docs/CODEX_M10_REVIEW.md. Local review accepted; publication and remote verification are Codex's responsibility.

## Round 3 — bounded recovery after reproduction in dev (AR6, `ai_invalid_output`)

- **Cause** (repro `/tmp/analogos-m10-debug-live.mjs`): valid M8; the AI returned 6 valid ids from the same sector (cap 3) and strict validation discarded everything. Guardrails unchanged: caps are not raised and nothing is trimmed.
- **Change (server only + additive typing in `shared/geology/guidance.ts`)**: in `runExplain`, only with the geological channel and a semantically invalid selection (the call succeeded), **one** second call with the same facts and schema plus a fixed `<reminder>` per typed reason (`GeologyRejection`: shape, total, per sector —with the `site_id` only if it is from the catalog—, foreign, repeated, or invalid M8 selection). The reminder does not repeat text from the rejected response; the original facts and the confirmed objective are sent again. Full M8+geology is revalidated; if it fails again, `ai_invalid_output` and fallback remain intact.
- **No retry** on timeout, refusal, rate limit, truncation, upstream/non-JSON errors, nor M8 without geology (without the channel: a single call).
- **Total deadline**: `startedAt` with `Date.now()`; the second call uses `timeoutMs = total − transcurrido` (optional `StructuredCall.timeoutMs`) and is not attempted with < 2 s remaining.
- **Provenance**: that of the response finally accepted; the first call's consumption is **not** added (public M8 contract unchanged; evidence in tests only).
- **Prompt**: `geology.budget = { per_site: 3, total: min(12, 3 × sectors with references) }` and text asking to count per sector. Without `maxItems` (post-validation, according to the structured outputs documentation).
- **Tests** (`aiGeology.test.ts`, +7): 4 valid AR6 → 3 valid with provenance/usage of the second and reminder without echo; second invalid → rejection after exactly 2 calls; foreign/duplicates/>cap and invalid M8; evaluation unchanged; no retry on 500/429/401, refusal, max_tokens, non-JSON nor without channel; remaining deadline (≤ 11 s after 9 s consumed; no retry with 1 s remaining); budget in the prompt.
- **Verification** (`/tmp/m10-verify2.log`): 316 Python, 332 web (+3 skipped), typecheck/build OK; `git diff --check` clean. Real AR6 repro ×3: all three correct (evidence in `submission/evidence/m10-ar6-retry-live-evidence.json`; it does not distinguish whether there was a retry).
- **ZIP**: it changed anyway because `shared/geology/guidance.ts` enters the web bundle (additive change): SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repeated identical. Codex decides whether to regenerate/publish; there are no behavior changes in the UI.
- Gap: the retry consumes a second call (latency/cost) only when validation fails; not measured in dev.

## M10 — final publication and remote verification (Codex, 2026-11-14 America/Santiago)

**Completed, reviewed and published in dev.** Implementation by Claude on commission; review, returns, corrections and acceptance by Codex. Code `4708b42b4bd152dca74d3e009f233a910e458d8b`; [Actions correct](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43665786554); [dev](https://analogos-dev.vercel.app/); deployment https://analogos-5plfynboc-pruebas-730d0f41.vercel.app. The later documentation checkpoint uses `[skip ci]` and keeps this deployed code. This delivery did not modify main, secrets or Vercel protection.

- The real Vercel function passed the isolated check: two filePathMap entries materialized; snapshot/contracts/geology load and validate; absence/corruption cases correct before publishing.
- Real test from Chrome in dev, sector AR6 (`ar-win-s2580-w06710`), synthetic mobility/geological reconnaissance brief, regional slope ≤9° and non-vegetated preference ≥95 %. The only evaluated sector was prioritized; traction and territorial feasibility pending. These are demonstration thresholds, not operational recommendations.
- Anthropic chose three valid references: characterize surface material in the Galán volcanic complex and alluvial/colluvial deposits, plus checking map–terrain correspondence of the first. Source SEGEMAR 1:250.000, coverage 100 %, limits and official link visible. No change to evaluation, values or ranking.
- Downloaded export: `submission/evidence/m10-dev-geology-export.json`. Validated with `validateAnyMissionExport` and rebuilt identically with `buildMissionGeologyExport`, official snapshot and context. Screenshot: `submission/assets/analogos-m10-dev.jpg`.
- Provenance: model `claude-sonnet-5-5`, `2026-11-15T02:02:57.957Z`, request `req_011Ch3teqxMdwPrJqPCngjWE`, tokens 6795/719, `end_turn`. This evidence proves the accepted response; it does not record whether the internal retry was required nor add its consumption.
- Final verification: **316 Python, 332 web**, typecheck/build correct. Two final contrasting real objectives: mobility and sampling, 12 valid references each, distinct purposes (`submission/evidence/m10-live-geology-evidence.json`). Three local AR6 queries correct; M8/M9 regression and integrity repros correct; 33 protected files intact.
- Current ZIP: **31 entries, 13.255.407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repeated identical. Local QA offline/subfolder/absence of geology/mobile 390px/keyboard documented in `docs/CODEX_M10_REVIEW.md`; the latest changes only add server recovery and shared typed rejection reasons, without changing the flow or the data.

Before this release, the model exceeded the cap of three references per sector in AR6. The rejection was maintained and a single second call with a controlled reminder was added, with the same facts and full validation, within the total time limit. If it fails again, the app keeps the manual result. Caps are not raised and the output is not trimmed. The initial packaging failures were resolved before the alias was updated.

Limits: seven pilot sectors; reconnaissance guidance, with no geological field validation, lithological score, measured traction or access authorization. In M10, the explanation with geology was tested remotely; the remote test of draft generation remains as an M9 precedent, and no new execution is attributed to M10. The native print inspection is still pending. Claude is left with no new assignment.
