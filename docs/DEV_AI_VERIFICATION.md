# Verified AI — production and dev background

## Production — 2026-11-15

Delivery `7e8c779` was published from main and passed the two real Anthropic operations from `https://analogos.vercel.app/`, including AR6 geology. Export validated and rebuilt identically: `submission/evidence/production-geology-export.json`. Provenance, Actions and verification scope in [PRODUCTION_RELEASE.md](PRODUCTION_RELEASE.md). The dev blocks that follow are background, not the current production version.

## Explore/Mission integration — Codex, 2026-11-15

**Final published closure:** code `9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`, [Actions 43681551867 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), including isolated startup of the packaged function and fixed alias. From a new dev tab, AR6 → Evaluate this sector → Submit was repeated: it preserves the route and geometry. The two real Anthropic calls were repeated, with no simulated responses.

- Final draft: `req_011Ch4ApuLtToXEojFVFZVG5`, `2026-11-15T05:35:08.907Z`, `claude-sonnet-5-5`, 2229/1637 tokens, `end_turn`. Six unconfirmed requirements; explicit confirmation and a single prioritized AR6 window.
- Final explanation/geology: `req_011Ch4Auogxy1aMjkFPPkkB5`, `2026-11-15T05:36:08.544Z`, same model, 7521/354 tokens, `end_turn`. Three valid references: characterize Galán surface material and alluvial/colluvial deposits, plus recognize Galán lithological diversity. The selection may vary; the units and texts are resolved against the closed catalog and the deterministic result remains the same.
- `submission/evidence/integration-final-dev-geology-export.json`: validation with no issues and identical rebuild with official snapshot/context. SHA-256 `e1d5ffcf461af972a2422423b8da6ec2eeeb953e992360fee3caed07cbaaa653`. Screenshot `submission/assets/analogos-integration-final-dev.png`.
- The later checkpoint only adds documentation and evidence with `[skip ci]`; it does not alter the deployed code or require regenerating the ZIP.

### Initial test on Gus's integration

On the deployed `dd625b4` ([Actions 43678787020](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020)), **both Anthropic operations from the new interface** were actually tested, with geology enabled in the explanation. Synthetic brief, six proposed requirements left unconfirmed, explicit human test confirmation, one AR6 window evaluated and three SEGEMAR geological references selected. No change to numbers, statuses or order by the AI.

- Draft: `req_011Ch49r2xSqLrAHSpZDFz6w`, `2026-11-15T05:22:19.635Z`, `claude-sonnet-5-5`, tokens 2229/1842.
- Explanation/geology: `req_011Ch49vXptJHdQhMzJSRTMq`, `2026-11-15T05:23:11.255Z`, same model, tokens 7536/374.
- Both responses `end_turn`. Export `submission/evidence/integration-dev-geology-export.json`, validated with `validateAnyMissionExport` and rebuilt identically with `buildMissionGeologyExport` and official data. Screenshot `submission/assets/analogos-integration-dev.png`.
- The review separately fixed the loss of scope when sending the brief from the dock; it did not change the engine, the AI client or the server. Acceptance scope and pending items in `docs/CODEX_INTEGRATION_REVIEW.md`.

The following blocks preserve the results of their respective versions; they do not describe the current number of tests or the current ZIP.

## M10 — final publication and remote verification (Codex, 2026-11-14 America/Santiago)

**Completed, reviewed and published in dev.** Implementation by Claude on assignment; review, returns, corrections and acceptance by Codex. Code `4708b42b4bd152dca74d3e009f233a910e458d8b`; [Actions successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43665786554); [dev](https://analogos-dev.vercel.app/); deployment https://analogos-5plfynboc-pruebas-730d0f41.vercel.app. The later documentation checkpoint uses `[skip ci]` and preserves this deployed code. This delivery did not modify main, secrets or Vercel protection.

- The real Vercel function passed the isolated check: two filePathMap entries materialized; snapshot/contracts/geology load and validate; absence/corruption cases correct before publishing.
- Real test from Chrome on dev, AR6 sector (`ar-win-s2580-w06710`), synthetic mobility/geological reconnaissance brief, regional slope ≤9° and non-vegetated preference ≥95 %. The only sector evaluated was prioritized; traction and territorial feasibility pending. These are demonstration thresholds, not operational recommendations.
- Anthropic chose three valid references: characterize surface material in the Galán volcanic complex and alluvial/colluvial deposits, plus verify map–terrain correspondence of the former. SEGEMAR source 1:250.000, coverage 100 %, limits and official link visible. No change to evaluation, values or ranking.
- Export downloaded: `submission/evidence/m10-dev-geology-export.json`. Validated with `validateAnyMissionExport` and rebuilt identically with `buildMissionGeologyExport`, official snapshot and context. Screenshot: `submission/assets/analogos-m10-dev.jpg`.
- Provenance: model `claude-sonnet-5-5`, `2026-11-15T02:02:57.957Z`, request `req_011Ch3teqxMdwPrJqPCngjWE`, tokens 6795/719, `end_turn`. This evidence proves the accepted response; it does not record whether the internal retry was required nor add its consumption.
- Final verification: **316 Python, 332 web**, typecheck/build correct. Two contrasting final real objectives: mobility and sampling, 12 valid references each, distinct purposes (`submission/evidence/m10-live-geology-evidence.json`). Three local AR6 queries correct; M8/M9 regression and integrity repros correct; 33 protected files intact.
- Current ZIP: **31 entries, 13.255.407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repeated identically. Local QA offline/subfolder/absence of geology/mobile 390px/keyboard documented in `docs/CODEX_M10_REVIEW.md`; the latest changes only add server recovery and shared typed rejection reasons, without changing the route or the data.

Before this publication, the model exceeded the cap of three references per sector in AR6. The rejection was kept and a single second call was added with a controlled reminder, the same facts and full validation, within the total time limit. If it fails again, the app keeps the manual result. Caps are not raised and the output is not trimmed. The initial packaging failures were resolved before updating the alias.

Limits: seven pilot sectors; reconnaissance guidance, without field geological validation, lithological score, measured traction or access authorization. In M10 the explanation with geology was tested remotely; the remote draft-generation test remains as M9 background, and no new execution is attributed to M10. Native print inspection is still pending. Claude is left without a new assignment.

## M9 background — publication and remote regression

**M9 completed and published in dev.** Code `34e76b9734efab2428013a13c6d0defb8d85d8f4`, Actions successful: https://github.com/Esteban12-hori/AnalogOS/actions/runs/43658989969. Deploy https://analogos-nmyfr42k8-pruebas-730d0f41.vercel.app, alias https://analogos-dev.vercel.app/. The later checkpoint adds only documents/evidence with `[skip ci]` and preserves that deployed code. Main did not change.

- The actually packaged function passed the startup check (modules/snapshot/contracts, GET 405 and POST without key 503). Vercel protection and credential configuration were kept.
- Geology in dev: Chile 99,4 %, Argentina 100 % and Yungay reference 99,1 % observed; units and scale correct. Argentine export downloaded and validated, identical to the one rebuilt from the package: `submission/evidence/m9-dev-geology-export.json`.
- Real AI regression: synthetic brief with regional median slope ≤ 2,3°, non-vegetated preference ≥ 95 %, permits pending. Anthropic proposed three editable requirements; explicit confirmation and evaluation prioritized one of seven areas. The explanation highlighted existing reasons without altering numbers or exclusions. Permits and feasibility remained pending.
- AI JSON downloaded from dev, contract validated and evaluation recomputed identically; full rebuild with `buildMissionExport` also identical. Evidence: `submission/evidence/m9-dev-ai-export.json`.
- Draft: `claude-sonnet-5-5`, `2026-11-15T00:38:32.854Z`, request `req_011Ch3nDHnwnQR73oKU4vndZ`, tokens 2177/1010, `end_turn`.
- Explanation: `claude-sonnet-5-5`, `2026-11-15T00:39:27.098Z`, request `req_011Ch3nHb48fJE7MMfz5V45L`, tokens 5792/460, `end_turn`.
- Screenshots: `submission/assets/analogos-m9-dev.jpg` and `analogos-m9-dev-ai.jpg`. The AI still uses exclusively the M8 engine/evidence; it does not consume the new geological context.

Accepted by Codex after reviewing Claude's implementation and correcting the final presentation. Claude is left without a new assignment. Field validation, absolute accuracy or universal absence of defects are not claimed; the tests cover the M9 scope and its observed regressions.

## M8 background — 2026-11-14

**Result: published and verified.** Dan authorized uploading M8 to dev and testing the AI there. Codex carried out the delivery, fixed the failure detected in the first publication and verified both operations from Chrome with the authorized Vercel session.

- Team URL: https://analogos-dev.vercel.app/
- Deployed code: `9060970ecf71e3c68f7b11a8d220e37e49057dc8`.
- Final Actions, successful: https://github.com/Esteban12-hori/AnalogOS/actions/runs/43639834860
- Deployment: `dpl_Ar1mb5AXiyviiCaBbWmAFPvWmAvE`, https://analogos-op5lhed43-pruebas-730d0f41.vercel.app/
- The later checkpoint only adds documentation and evidence; it uses `[skip ci]` to preserve this already verified deployment. Main and production were not published.

## Real end-to-end test

Synthetic input: autonomous navigation test of a Martian rover, regional slope median of the full window ≤ 2,3°, non-vegetated surface preference ≥ 95 % and pending verification of access permits.

1. "Propose requirements with AI" returned three editable requirements with citations from the brief, without confirming them automatically. It kept permits as unmeasured.
2. The confirmation showed the effective values/units/scale. The evaluation prioritized `cl-win-s2500-w06970` and discarded the other six for failing the required slope; it kept partial comparison and territorial feasibility pending.
3. "Highlight reasons with AI" returned a valid selection of calculated reasons; it showed failures, pending permits and verifications. It did not change values, statuses or ranking.
4. The JSON was downloaded from dev. Codex validated its contract, recomputed the evaluation locally and verified exact equality, fingerprint and selection of reasons. It preserves both Anthropic provenances.

| Operation | UTC date | Model | Request ID | Input/output tokens |
|---|---|---|---|---|
| Draft | 2026-11-14T20:54:49.557Z | claude-sonnet-5-5 | `req_011Ch3V9sX8XWfnCFHCehTem` | 2166 / 870 |
| Explanation | 2026-11-14T20:55:30.448Z | claude-sonnet-5-5 | `req_011Ch3VD7AVeY7uEpeKT9i9e` | 5751 / 461 |

Both finished with `end_turn`. Full export of the example: `submission/evidence/m8-dev-ai-export.json`. Screenshot: `submission/assets/analogos-m8-dev-ai.png`. The automatic download observer timed out; the browser had in fact saved the file, which was recovered from disk and validated. This timeout is not attributed to the application.

## Verified fix

The initial publication `707d4b1` passed build/deploy but the function ended with `ERR_REQUIRE_ESM`: the CommonJS server required code from the web's nested ESM package. The single implementation of the engine and the validators was extracted to `shared/`; the web keeps re-exports and the server imports that core directly. No changes to rules, data or dependencies.

The workflow now runs `scripts/check-vercel-function.mjs` against the actually packaged function before deploying. It checks module loading, snapshot and contracts, the GET response 405 and POST without a key 503. It passed in Actions and in a local Node build. The server typecheck uses NodeNext.

## Configuration and final verification

- `ANTHROPIC_API_KEY` is stored in GitHub Secrets and injected only into the dev runtime through the workflow. It does not appear in Git, the bundle, the ZIP or the evidence. The key is not incorporated into the build.
- Existing Vercel protection remains active; the tests used the authorized session. It was not disabled and no access credentials were published.
- Tests after the fix: 177 Python, 196 web (+2 real opt-in tests skipped by default), typecheck and build correct. The earlier real remote calls complement that suite.
- The 38 hashes of the existing scientific baseline, visual baseline, configuration and contracts remain intact.
- Final ZIP: 30 entries, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`. Repeated packaging is identical and entries were checked against dist.

Local reproduction: `source .venv/bin/activate && npm run verify`; `npm run release:package`. To repeat the remote test, open dev with authorized access, define the example, generate requirements, confirm/evaluate, highlight reasons and download JSON. Each AI action makes a real call.

The verified availability corresponds to this configuration and date. The scientific limits of M8 are maintained: seven areas, rover/Jezero profile, no acquisition for new polygons and no terrain permissions. Visual inspection of native printing remains pending and does not affect these two AI operations.
