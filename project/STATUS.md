# EN | ES selector: review fixes on `feature/es-selector` — Claude, 2026-11-15

- **Request:** fix the review findings of the integrated selector (one medium, three low) and re-verify. ADR-017 still **proposed**; nothing pushed; dev/main untouched; no contract, record, export, server or AI change.
- **Fixed (all four, each reproduced in the browser before and checked after):** (medium) the focusable MapLibre canvas of the 2D map was named “Map” in Spanish: it is now named in the interface language (`mapUiStrings`, passed to the MapLibre constructor and re-applied on a language change; “Map” in English as before). (low) Event-written live regions (planner step announcement, mobile metrics carousel) kept the previous language after switching: new `useLiveText()` empties them on a language change and never brings old text back. (low) Spanish-only truncations at narrow widths: the places title keeps its width (tools shrink first, chips on one row with 8 px padding at ≤560 px containers; styles.css `.country-filter` used to override the places rules); Spanish dock prompt shortened to «Describe tu prueba para Marte…»; two more Spanish-only cuts found by the new measurement fixed in the ◆ card (« · fuera de la búsqueda», «sin %, sin puesto»). (low) Error screen: the loader's own messages are canonical English and shown in Spanish (`data/snapshotError`, keys `app.loadFailed`/`app.outlineInvalid` with the 273e5f8 wording); any other technical detail (Ajv, “Failed to fetch”) is marked `lang="en"` in Spanish.
- **How to run:** `PATH=/tmp/claude-venv314/bin:$PATH npm run verify`; `npm run dev` and use the EN | ES selector or `/?lang=es`. Package: `npm run release:package -- --zip <file> --checksum <file>`.
- **Tests:** `npm run verify` green: 330 Python passed (5 skipped); typecheck:server; web **1027 passed**, 3 opt-in skipped (+7 Spanish tests in `uiCore.es`/`missionUi.es`: canvas name, live-text rule, planner region, dock prompt, loader messages with the real loader and a stubbed `fetch`, PlaceRail error); build. English tests untouched (`i18n.test.ts` only had its two Spanish prompt assertions updated). Package `/tmp/claude-rel/es-fix.zip`: 81 entries, 15,085,003 bytes, CRC OK, SHA-256 `156dddd63a690e31feebf698775a5b0e49afc2eb77c1623b79d7b8c72bf6a7a7`; `submission/` untouched. Browser on the final build (port 5011): targeted script `/tmp/claude-pw/es-fix-5011-targets.mjs` **137 checks, 0 failures** (canvas “Map”/“Mapa” after EN→ES→EN and ES→EN→ES; planner and carousel regions emptied on switch, next announcement in the new language; no Spanish-only truncation and no horizontal scroll at 360×740, 740×360, 390×844 and 1440×900 in Explore and Mission; chips on one row; four forced error cases in EN and ES) and the full integration walk `/tmp/claude-pw/es-fix-5011-regress.mjs` **123 checks, 0 failures**, no page/console errors, 12 export comparisons byte-identical EN = ES. 31 HTTP 500 responses from NASA GIBS online HLS tiles (external, outside the offline path) were logged by Chrome during the 2D steps and ignored.
- **Files changed:** `apps/web/src/features/globe/{CandidateFlatMap.tsx,mapUiStrings.ts}`, `apps/web/src/i18n/{react.ts,index.ts}`, `apps/web/src/components/planner/PlannerView.tsx`, `apps/web/src/features/metrics/MetricDetails.tsx`, `apps/web/src/features/places/{places.css,PlaceRail.tsx}`, `apps/web/src/data/{snapshotError.ts,loadDemoSnapshot.ts}`, `apps/web/src/App.tsx`, `apps/web/src/i18n/messages/{globeMarkers,shell,places}.ts`, tests `apps/web/src/tests/{uiCore,missionUi}.es.test.tsx`, `apps/web/src/i18n/i18n.test.ts` (Spanish prompt), `docs/I18N.md`, `project/STATUS.md`, `project/CHANGELOG.md`.
- **New decisions (I18N §4.2, §4.5, §4.6, §11):** live regions written by an event are emptied on a language change (not re-translated, to avoid a second announcement); a pre-ADR-016 Spanish wording may be shortened when it loses words to an ellipsis where English fits (three cases, old wording quoted next to the key); loader messages are canonical English mapped when shown, other technical details are marked English.
- **Blockers:** none. **Cost:** initial chunk 560.4 KB (gzip 159.6 KB), +1.1 KB raw over the integration.
- **Not verified (unchanged):** a real Spanish AI draft against Anthropic; a full Spanish PDF of the print report page by page; physical iOS.
- **Next three steps:** 1) Codex review of ADR-017 and `feature/es-selector` before any push or publication; 2) one real Spanish AI draft with the key and a page-by-page Spanish PDF audit; 3) I18N §11 follow-ups (shared Spanish vocabulary in `common.ts`, client-side AI failure codes, on-demand `es` catalog halves).
- The integration block below stays valid except for the counts above; older checkpoints are historical.

---

# EN | ES selector integrated (base + ui-core + mission-ui + ai-science) on `feature/es-selector` — Claude, 2026-11-15

- **Request:** English by default with a selector that allows Spanish. ADR-017 (**proposed**, compatible with ADR-016): English stays the source and the only record language; Spanish is presentation only. Branch `feature/es-selector` (from `origin/dev` `f45315f`); merged with `--no-ff`: `es/ui-core` (106124d), `es/mission-ui` (177d645), `es/ai-science` (7d881eb); no conflicts. Not pushed; dev/main untouched.
- **Works:** EN | ES selector (URL > localStorage > en, `<html lang>` from the static head, static shell translated before React). In Spanish: top bar, boot, Explore (places, carousel, metrics rail, leader lines, globe/2D map labels and sources), place sheet and its eight tabs, rail with mission rows, composer, “Your mission”, planner (3 steps), result, print report, Reading (es-CL figures), geology card and guidance (official unit names alone, no glosses), AI messages. Record text shown with the frozen Spanish packs; artifact text shown in its original Spanish; English output unchanged. AI draft sends `language: 'es'` only from the Spanish interface; server validates `en | es` (absent = `en`, prompts byte-identical), `source_quote` stays literal, explain/geology unchanged.
- **How to run:** `PATH=/tmp/claude-venv314/bin:$PATH npm run verify`; `npm run dev` and use the EN | ES selector or open `/?lang=es`. Portable package: `npm run release:package -- --zip <file> --checksum <file>`.
- **Tests:** `npm run verify` green: 330 Python passed (5 skipped); typecheck:server; web **1020 passed**, 3 opt-in skipped (base 941; +17 `uiCore.es`, +20 mission-ui incl. catalog parity, +32 `aiLanguage`/`geologyContext.es` and parity); build. English tests untouched. Package `/tmp/claude-rel/es.zip`: 81 entries, 15,083,530 bytes, CRC OK, SHA-256 `775687fd3f8af663c4f06a55d660f61699e104237e442d72b2525a1e96b4723b` (`submission/` not touched). Browser walk on the built app (port 4991, `/tmp/claude-pw/es-integ-4991.mjs`, 123 checks, 0 failures, no page/console errors): 1440×900 and 390×844, EN default, ES by selector (keyboard, focus kept, `aria-pressed`) and by `?lang=es`, localStorage and `?lang=en` precedence; Explore, selection, place sheet and all tabs, Mission manual, Mission with `/api/ai` simulated through the real server handler (draft body has no `language` in EN and `language: "es"` in ES; Spanish language rule in the server prompt; explain without `language`), planner, geology, 2D map, loading/boot, static shell without JS, logo (wordmark ≤540 px hidden by design, emblem always visible, selector never overlaps it, 44 px touch area). **Exports byte-identical EN = ES** (bytes and filename) in 12 comparisons: mission JSON 1.1.0 and geology-wrapper JSON (schema 2) after manual EN→ES, manual ES→EN, AI draft EN, AI draft ES by selector and by URL; per-site geology context (schema 2) and site record. No horizontal overflow at 390 px. Remaining Spanish-interface English is user text from an example loaded in English, IDs (`mission-rules-1.0.0`) and proper names; remaining English-interface Spanish is official names (SERNAGEOMIN, dataset titles).
- **Files changed (integration):** merges of the three area branches (see each branch commit); `apps/web/src/features/analysis/ReadingView.tsx` (one line: pass `locale` explicitly to `buildMetricViews`); `docs/I18N.md` (status, API table with the new helpers, §4.6 canonical mission messages and template-created user text, ownership table with the new catalogs, cost, cross-area table, known limits and follow-ups); `docs/decisions/ADR-017-spanish-presentation-layer.md` (status and consequences); `project/STATUS.md`; `project/CHANGELOG.md`.
- **New decisions (recorded in ADR-017/I18N, still proposed):** example, default requirement names and default target are created in the interface language and become user text; mission messages stay canonical English in state and are translated when shown; AI client failure messages are built in the interface language when the result arrives (known limit: they keep that language after switching until the next request).
- **Blockers:** none. **Cost:** initial chunk 559.3 KB (gzip 159.2 KB) vs 519.1 KB (147.4 KB) at the base and 511.8 KB (145.0 KB) before the selector.
- **Not verified:** a real Spanish AI draft against Anthropic (`test:ai-live` has no Spanish case; the Spanish prompt is verified with a mocked provider only); a complete Spanish PDF of the print report audited page by page; physical iOS.
- **Next three steps:** 1) Codex review of ADR-017 and of `feature/es-selector` (accept or request changes) before any push or publication; 2) run one real Spanish AI draft with the key and audit the Spanish print/PDF; 3) follow-ups in `docs/I18N.md` §11: move the duplicated Spanish criterion/feasibility/status labels of `reading.ts`/`mission.ts` to `common.ts`, add client-side AI failure codes so its messages are stored canonically, and load the `es` catalog halves on demand (≈12 KB gzip less for English sessions).
- The base checkpoint below is superseded by this block; older checkpoints are historical.

---

# EN | ES selector — base ready on `feature/es-selector` — Claude, 2026-11-15

- **Request:** keep AnalogOS English by default and add a selector that allows Spanish. Decision recorded as **ADR-017 (proposed)**, compatible with ADR-016: English stays the source and the only record language; Spanish is presentation only. Branch `feature/es-selector` from `origin/dev` `f45315f` (English production + logo); not pushed; dev/main untouched.
- **Works (base):** language store (`useSyncExternalStore`, default `en`, `?lang=` > localStorage > `en`, `<html lang>`), typed per-area catalogs with compile-time key/shape parity, UI formatters en-US/es-CL, accessible EN | ES selector in the top bar next to the logo, `<head>` script and Spanish static shell before React, record-text display with the frozen Spanish packs (`displayRecordText`, engine as oracle), science-text display (original Spanish in ES, sourceText/glosses in EN). Translated now: top bar, mode tabs, sheet head, left-panel label, App error/promise, boot log/chip/announcement, data credit, meta description.
- **Not yet translated (parallel areas, `docs/I18N.md` §7):** ui-core (ficha, rail, places, metrics, leaders, globe/2D map, components), mission-ui (composer, Reading, planner, print, record display), ai-science (`language` field for AI drafts, geology card, science helpers adoption).
- **How to run:** `PATH=/tmp/claude-venv314/bin:$PATH npm run verify`; `npm run dev` and open `/?lang=es` or use the EN | ES selector.
- **Tests:** `npm run verify` green: 330 Python passed (5 skipped); web 941 passed, 3 opt-in skipped (baseline 899); server types and build passed. New: `apps/web/src/i18n/i18n.test.ts`, `recordText.test.ts`, `catalogParity.typecheck.ts`. Browser walk on the built app (port 4961): English by default, selector switches to Spanish, persists after reload, keyboard Enter back to English, focus kept, announcement “Idioma: Español”, static shell in Spanish with JS blocked (`?lang=es`), no horizontal overflow and no overlap of logo/tabs/selector at 360, 390, 430, 540, 761, 1024 and 1440 px in both languages; no page errors.
- **Files changed:** `apps/web/src/i18n/*` (new base), `apps/web/src/i18n/messages/{shell,boot}.ts`, `apps/web/src/{App.tsx,content/shell.ts}`, `apps/web/src/shell/{AppShell.tsx,ModeTabs.tsx,attribution.ts,shell.css}`, `apps/web/src/features/boot/{bootModel.ts,BootLayer.tsx,StatusChip.tsx,loadingHints.ts}`, `apps/web/vite.config.ts`, `docs/I18N.md`, `docs/decisions/ADR-017-spanish-presentation-layer.md`, `project/STATUS.md`, `project/CHANGELOG.md`.
- **New decisions:** ADR-017 (proposed). The wordmark leaves the bar at ≤540 px instead of ≤420 px so logo emblem, tabs and selector fit at 360 px. Records/exports byte-identical in EN and ES (tested). The AI client will send `language` only for Spanish.
- **Blockers:** none. Cost: initial chunk +7.3 KB (gzip +2.4 KB); `index.html` +2.4 KB.
- **Next three steps:** 1) run the three areas in parallel per `docs/I18N.md` §7 (ui-core, mission-ui, ai-science); 2) integrate them on `feature/es-selector`, full verify and a Spanish browser walk of Explore, Mission, Reading and print; 3) Codex review of ADR-017 before any publication.

---

# ENGLISH-DEFAULT completed in production — Codex, 2026-11-15

- **Completed scope:** English application, accessibility, AI-generated prose, reports, product/technical/internal/historical documentation, code comments/help/errors and test descriptions. Complete `README.es.md` and explicitly Spanish submission alternatives retained. ADR-016 accepted.
- **Published code:** `fab8ed9d03f7cce54c90308f93eeffa5b3779543` on dev and main, fast-forward without force. Final Actions: dev `43723813882`, production `43724021553`, both successful. Sites: https://analogos-dev.vercel.app/ and https://analogos.vercel.app/.
- **Verification:** independent full check at 18b14eb: 335 Python / 898 web passed, three opt-in skipped, types/build/generated validators passed. Final mobile-copy patch: 41 related tests and build passed, including one additional regression test. No API, calculation, source data, dependency or contract change in that patch.
- **Real AI:** dev browser produced four unconfirmed English requirements, explicit confirmation, AR6-only evaluation and three geological references; downloaded wrapper validates and reconstructs identically. Production endpoint passed draft and explanation/geology, with unchanged evaluation fingerprint. English and Spanish input were both tested locally. Evidence: `submission/evidence/english/`.
- **Presentation:** desktop/mobile English UI verified; final Refine label and metric counter confirmed in production. README screenshot replaced from actual production; mobile evidence at 390×844. New mission records use 1.1.0 and geology v2, with historical reconstruction intact.
- **Scientific integrity:** original artifacts, official source wording, user input, stable identifiers and historical exports preserved. Current ZIP: 74 entries, 14,891,807 bytes, CRC/checksum OK and repeat-identical; SHA-256 `86a157e08416a3d1b0ea3e1129c9a45f73e850e464b943936d9cb2e2077e6d19`. Historical archive unchanged.
- **QA limits:** English native print preview opened, but no new complete PDF was saved and visually audited page by page. Historical M11 PDF evidence is not presented as a fresh English audit. Physical iOS and deliberate GIBS network failure remain untested. See `docs/CODEX_ENGLISH_REVIEW.md`.
- **Owner:** Codex; task completed. Claude has no new assignment. The final `[skip ci]` documentation/evidence checkpoint changes no deployed code. Keep unrelated untracked `outputs/` excluded.
- **Next:** prepare the English presentation from submission materials; collect physical-device and full English-PDF QA when available; agree on a new milestone before implementation. These are future tasks, not authorization to start them.
- All checkpoints below are historical and superseded by this block.

---

# ENGLISH-DEFAULT accepted; publication in progress — Codex, 2026-11-15

- English default covers UI, accessibility, AI prose, reports, README, product/technical/internal/historical documentation and authored code prose. `README.es.md` and explicitly Spanish submission alternatives are preserved.
- Claude's three implementation phases reviewed; ADR-016 accepted. Independent verification: **335 Python / 898 web passed, three opt-in skipped**, types/build/generated validators and diff-check passed. Real English/Spanish AI drafts, AR6 explanation/geology and export reconstruction passed locally.
- Source evidence, official names, user text, identifiers and historical exports retain their original wording. New mission records use 1.1.0 and geological exports/wrappers v2; old versions still reconstruct exactly. No science/dependency changes.
- Owner Codex, branch dev. Current scope: portable package, supervised dev/main publication, deployed AI checks and English production screenshot. No new assignment for Claude; unrelated `outputs/` excluded.
- Evidence and explicit QA limits: `docs/CODEX_ENGLISH_REVIEW.md`. English native preview opened; a new complete PDF file was not audited page by page. Existing M11 PDF remains historical evidence.
- The checkpoints below are historical.

---

# ENGLISH-DEFAULT in progress — Codex, 2026-11-15

- **User request:** English throughout the repository and application, with `README.es.md` retained. English pitch/demo variants added; explicit Spanish alternatives and original scientific evidence remain labeled.
- **Owner/scope:** Claude implements Phase B review corrections and Phase C from NEXT_TASK. Codex owns concurrent documentation translation, review and release. Branch dev, base `273e5f8`; no English release published yet.
- **Phase A accepted:** new English mission evaluation/export 1.1.0 and geology wrapper/per-site v2; historical versions retained. Codex independently verified 335 Python / 868 web tests, 3 opt-in skipped, types/build passed. All ten historical exports reconstruct; twelve legacy golden cases and science invariance pass. All 77 protected artifacts/evidence files unchanged.
- **Evidence:** `docs/CODEX_ENGLISH_REVIEW.md`, `project/ENGLISH_PROGRESS.md`; log `/tmp/analogos-english-phase-a-codex-verify.log`.
- **Next:** finish reviewed corrections and remaining code/help prose; local English/Spanish real AI and export reconstruction succeeded; independent browser/mobile/PDF/live-AI checks, packaging and supervised publication. Existing `outputs/` remains excluded.
- The checkpoints below are historical; their previous “no assignment” and completion statements do not cancel this active scope.

---

# M11 completed in production — Codex, 2026-11-15

- **Milestone closed:** M11-READING-PRINT. Claude implemented it; Codex reviewed three rounds, fixed the provenance grouping, and approved it with real browser/PDF QA.
- **Code published:** `e5e91390b2eea261b1f8d46f3b17786b2bb295dc` on dev and main, without force. Dev Actions `43686593750` and production `43686863876` succeeded. Sites: https://analogos-dev.vercel.app/ and https://analogos.vercel.app/.
- **Real AI in production:** four proposed requirements without confirmation; explicit confirmation; AR6 preserved and the only sector evaluated; explanation and three SEGEMAR geological references. Downloaded export validated and rebuilt identically. See `docs/CODEX_M11_REVIEW.md`.
- **UI and PDF:** mobile CTA next to the summary, 44 px; three screen widths, no selection, MDRS reference, zero prioritized, and geometry without coverage; Back/Escape and focus. Complete native PDF of 18 pages, legible tables and geology; when editing, a notice is printed instead of the previous report.
- **Verification:** 333 Python, 799 web, 3 opt-in skipped, types/build correct; 35 related tests and build after the final adjustment. Current ZIP CRC/checksum OK, SHA-256 `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- Science, contracts, server, data and dependencies preserved. Unrelated `outputs/` is not included. Final checkpoint is evidence/documentation only `[skip ci]`; it does not change the deployed code. No new assignment for Claude.
- **QA limits that are not presented as resolved:** physical iOS and GIBS tile failure due to network blocking. Mobile testing was done with Chrome sizes; the local/SVG fallback and the manual flow are preserved.
- **Next three steps:** 1) prepare the demo with the AR6 case and the evidence; 2) collect validation on a real phone and test GIBS network loss; 3) agree on the next milestone before delegating new work.

---

# M11 accepted; publication in progress — Codex, 2026-11-15

- **Active milestone:** M11-READING-PRINT. Claude implemented it; Codex reviewed three rounds and completed real mobile/desktop/PDF QA. Code accepted; remote publication and re-verification are still pending.
- **Works:** visible CTA with 44 px touch target; Reading with/without selection and references; keyboard/Back navigation; full report with geology; invalidation on edit. 18-page PDF reviewed, without clipping.
- **Verification:** 333 Python, 799 web, 3 opt-in skipped, types/build correct. After the last presentation adjustment: 35 related tests and build correct. ZIP CRC/checksum OK: `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- **Scope:** science, contracts, AI/server, datasets and dependencies intact; unrelated `outputs/` is not included. Physical iOS and GIBS network failure remain documented QA limits.
- **Authorization:** Dan expanded the task to reviewing the whole set and publishing main/production after verifying dev. Only Codex publishes; Claude has no new assignment.
- **Commands/evidence:** `docs/CODEX_M11_REVIEW.md`. No blockers.
- **Next steps:** 1) publish/verify dev; 2) advance main and verify production and real AI; 3) record commits, Actions and final evidence.

---

# M11 in review — Claude, 2026-11-15

- **Round 3:** printed criteria table with fixed layout and six balanced columns (`pl-criteria-table`, only `@media print`). Web 799 pass and 3 skipped; build correct. Codex will verify the new PDF.

- **Round 2:** “Go to Reading” is now a single action next to the compact result summary (after `pl-lead`, before chips and groups), with a 44 px touch target. Web 799 pass and 3 skipped; build correct. Visibility at 390×844 is left for Codex's check.

- **Claude's delivery (no commit):** “Go to Reading” in the compact result of “Your mission” and a fix to the printable report, according to the plan approved by Codex. Owner Codex, status review.
- **Navigation:** `uiActions.requestReading()` and `ui.readingRequest`. The surface is decided by the pure function `shell/readingRoute.ts`:
  - ≥1440: left panel;
  - 1100–1439: pill, also in Mission, with the label “Reading”;
  - <1100 with ●: S2 in the Reading tab of the card;
  - <1100 with no selection or with ◆: S2 with the `sheet.reading` view; Back, Esc, Back button and ✕ return to S0 or S1 without clearing the selection.

  Focus goes to the title with a bounded, cancelable retry. Navigating does not change selection, planner or scope, and does not call the AI.
- **Printing:**
  - reset of `html`/`body`/`#root`/`.app` in `@media print` (this was the cause of the one-page PDF);
  - pagination: sections that split, repeated table header, printed URLs;
  - `PrintGeology` with the same evidence as the screen: separate layer notice, coverage, units, source and date, limits and exclusions;
  - printed notice when there is no current report (initial load, edited test or report on its way);
  - “Print report” disabled with “Preparing report…” until the current `planner.result` report is mounted (`printState.ts`); clicking prints immediately.
- **Validation:** `PATH="$PWD/.venv/bin:$PATH" npm run verify` correct: 333 Python; web 798 pass and 3 opt-in skipped (62 files); server typecheck and build correct. New `apps/web/src/tests/readingPrint.test.tsx` with 14 tests. One assertion of `plannerGeology.test.tsx` was adjusted: the printed URL moves to the source line.
- **Limits:** the check is by SSR, logic and CSS. No native PDF was generated and no browser was used. Pending, in Codex's charge: 390×844, 1280×800, 1440×900, keyboard and real PDF with geology. There were no changes to science, `shared/`, server, JSON contracts, dependencies or `outputs/`.

---

# M11 in preparation — Codex, 2026-11-15

- **Active milestone:** M11-READING-PRINT. Claude assigned to the direct shortcut to Reading and report presentation; first checkpoint read-only, pending Codex's technical approval.
- **Base:** dev/main `ce86a87`, previous publication verified. Mission/AI/geology work; direct mobile navigation and native pagination are pending.
- **Validation:** there are no code changes or new tests yet; previous baseline 333 Python, 784 web and 3 opt-in skipped, types/build correct.
- **Limits:** no science/contracts/AI/data/dependencies; unrelated `outputs/` preserved. Only Codex publishes dev after accepting; Dan later expanded the goal to a full review and promotion to main/production once dev is verified.
- **Blockers:** none identified. Next steps: 1) review Claude's plan; 2) implement and review with UI/PDF tests; 3) accept, package and publish dev.
- Planned commands: `PATH="$PWD/.venv/bin:$PATH" npm run verify`; `PATH="$PWD/.venv/bin:$PATH" python scripts/package_release.py` after acceptance.

---

# Current status




## Official logo (2026-11-15, Claude)

- Official AnalogOS logo in the top bar, the static shell, the favicon and the README. No change to data, engine, AI or exports.

## Similarity color scale (2026-11-15, Claude)

- Red/yellow/blue/green according to the similarity %, with a legend “not suitability”. In local `dev` together with the mobile list fix; pending push and for Danilo to promote it to `main`.

## Mobile fix (2026-11-15, Claude)

- Empty list when swiping up the places sheet: fixed in `dev` (CSS of `features/places`, with test). Pending for Danilo to promote it to `main`.

## Promotion to production authorized — 2026-11-15

- **Owner:** Codex. **Status: completed and verified in production.** Dan asked to update the README and move the entire reviewed delivery from dev to main; he specified to publish first and then replace the screenshot with a capture of the new production.
- Base dev `513c44a`; remote main `437b515`, ancestor of dev. `main` is used (master does not exist). Promotion by fast-forward, without force.
- **Published:** `7e8c7798186e02a5014f6bf8b79554b7faa84c3c`, production [Actions 43682694089 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682694089), dev [Actions 43682693561 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682693561). Main and dev synchronized; subsequent documents/screenshot checkpoint with `[skip ci]` preserves that deployed code.
- README updated with Explore/Mission and a public link. Screenshot taken **after publishing**, directly from production: `submission/assets/analogos-production.jpg`.
- Workflow delivers the existing Anthropic secret only at runtime on dev and main; without a key, it stops the deployment. No changes to data, engine or interface.
- Prior verification: 333 Python, 784 web, 3 web opt-in skipped; types/build correct. Four scenarios of the deployment step checked with a simulated CLI: dev/main with and without a key; it does not print the key and main uses `--prod`. Local README links correct.
- **Real production AI verified:** draft of four requirements, explicit confirmation and exclusive evaluation of AR6; explanation/geology with three official references. `submission/evidence/production-geology-export.json` validated and rebuilt identically with the official data. Public web HTTP 200; GET function 405 expected.
- Review, provenance and limits: `docs/PRODUCTION_RELEASE.md`. The minor pending items already documented continue; there is no new task for Claude. Development continues on dev. The checkpoints below describe earlier deliveries.

---

## Background — integration verified in dev before production

**Last updated:** 2026-11-15, acceptance of the Explore/Mission integration (America/Santiago).
**Owner:** Codex. **Branch:** `dev`. **Status:** integration accepted, fix published and verified with real AI.

## Current checkpoint — close of Gus's handoff

- **Final delivery:** code `9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`, [Actions 43681551867 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), including packaged function, deploy and alias `https://analogos-dev.vercel.app/`. A later documentation/evidence checkpoint with `[skip ci]` keeps that deployed code.
- **Re-test after publishing:** AR6 → “Evaluate this sector” → dock → Send keeps the sector. Real Anthropic again proposes six requirements without confirming; confirmation and evaluation include only AR6. Real explanation/geology, three valid references. `submission/evidence/integration-final-dev-geology-export.json` validated and rebuilt identically; capture `submission/assets/analogos-integration-final-dev.png`. Model `claude-sonnet-5-5`; full provenance in DEV_AI_VERIFICATION.

- Integration `dd625b4` already merged and published; [Actions 43678787020 successful](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020). The merge/push blockers described below are historical.
- **Real AI verified in dev:** draft of six requirements, explicit confirmation, AR6 evaluation, Anthropic explanation and three SEGEMAR geological references. Downloaded JSON validated and rebuilt identically with the official data: `submission/evidence/integration-dev-geology-export.json`.
- **Finding fixed:** sending a brief from the dock after “Evaluate this sector” no longer changes the scope to all seven areas. Regression test first red, then green, and verified in the browser on the local build.
- **ADR-013 and ADR-014 accepted by Codex. Yungay decided:** outside the Explore ranking; known alternative that can be evaluated/prioritized in Mission, always REF. `shared/mission/evaluate.ts` is kept, in accordance with ADR-009 §5. CLAUDE.md reference corrected to ADR-006/007/014.
- **Verification:** 333 Python and 784 web pass; 3 opt-in web skipped; server types and build correct. ZIP regenerated, 73 entries / 14.792.109 bytes; SHA-256 `d977f0adf4f9e7e3d2ee4e9b780ee7f00d7124def36b24e1369a7270e8e12393` and CRC verified.
- Scientific core, server, data, dependencies and CI preserved. Pre-existing `outputs/` not included. No new assignment to Claude.
- **Bounded pending items:** direct navigation to Reading from the mobile popover (Sheet → Reading alternative verified), GIBS offline, native pagination/printing and real iOS. There is no field validation or guarantee of territorial suitability.
- Full review and evidence: `docs/CODEX_INTEGRATION_REVIEW.md`. Continuity: this block and `project/NEXT_TASK.md` take precedence over the following historical checkpoints.

---

## Historical background of the integration

## Review of the M9/M10 merge: findings fixed (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Request:** fix the findings of the review of `c1065d1` (1 medium and 6 low; none high), verify each one, repeat `verify`, the package and the browser walkthrough. **Push to `dev`: not done.** Local `dev` and `main` were not touched.

### What changed (and how it was verified)

- **Medium · compact “Your mission”:** the team's `GeologyGuidance` no longer unfolds between the headline and the export. It goes **after** “Download JSON”, “Print report” and “Back to edit”, inside a `<details class="pl-more pl-geo-fold">` closed by default. The summary says “Geological guidance for this test”, the team label (“AI selection” or “General guidance without AI”) and “N sectors”. Inside, the team's component unchanged (same texts, limits, source, units and “Download JSON with geological guidance”), plus the line saying where to request the AI selection. In the compact variant the outer frame of `.pl-geo` is removed and its h3 remains for screen readers only (the summary already shows it). The team view (without `compact`) does not change. Measured in Chrome (“Your mission” container, scroll height and position of “Download JSON”): **1440** 344 px strip, scroll 6.863 → **1.658**, button 6.670 → **1.408** (before the merge: 1.601 and 1.408); **1280** (popover) 5.586 → **1.454**, button 5.424 → **1.235**; **390** (popover) 6.763 → **1.647**, button 6.557 → **1.384**. The usable width of each sector rises to 326/426/332 px. With simulated AI, the summary says “AI selection” without opening the fold.
- **Low · sheet tab strip:** `TabList` marks `data-more-start` / `data-more-end` when tabs remain hidden and the CSS fades that edge (28 px). It also brings the active tab out of the fade by moving only the strip (without `scrollIntoView`, which would move the sheet or the rail). Chrome at 1440, 1280 and 390: on opening, end edge faded; with “Sources” active, it stays whole and the start is faded; Home returns to “Metrics” and the strip to the beginning. Pure functions `overflowEdges` and `revealDelta` with tests.
- **Low · “Geology” header in 390:** `.geology-context .subheading-row` does `flex-wrap` and, at ≤480 px, the subtitle drops entirely below the title. Chrome: title and subtitle on one line each (before, two lines each side by side).
- **Low · STATUS invariants:** the merge block said “no differences with `origin/dev` in `package*.json`”. It now says “root `package.json` and `package-lock.json`” and clarifies that `apps/web/package.json` has differed since the previous integration (`build` runs `build-validators.mjs --check`; `vercel build` + `check-vercel-function.mjs` verified). `docs/INTEGRATION_PLAN.md` §11, was corrected in the same way, as it also said “pipelines” were intact: `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` and `contracts/reference-analog.schema.json` have differed since the redesign (base maps and scenario references, not scientific artifacts).
- Documentation: `docs/INTEGRATION_PLAN.md` §11 (“Your mission” row) and `docs/DEMO_ACCEPTANCE.md` (geological guidance step) describe the fold.

### Findings not fixed

- **Low · `CLAUDE.md:34`** still cites “ADR-006/007/010” for the fixed scenario; after the renumbering it must say **“ADR-006/007/014”** (ADR-010 is now the team's geology). It was not edited: this agent does not change `CLAUDE.md` at the request of an automated flow. It is left for a person (one-line change).
- **Low · “Go to Reading” from “Your mission” on mobile:** the hint is still text. Reading lives in three places depending on width (left panel ≥1440, rail tab 1100–1439, S2 tab <1100) and the active tab is local state of each list; a button that navigates requires a shared channel in `uiActions` (selection + S2 sheet + tab). It is not trivial.
- **Low · GIBS tiles offline** (prior to the merge): 2D still requests them and the console logs the network failures; the map displays with the local images. Removing the sources after the first failure touches the map lifecycle and the active-sources report (attribution). No change.

### Tests performed

- `npm run verify`: **pytest 328 pass, 5 skipped**; `typecheck:server` correct; **vitest 783 pass, 3 skipped** (real AI opt-in) in 61 files (+4: fold after exporting and closed, summary with “AI selection”, team view unchanged, strip edges); build correct. Entry chunk 123,97 KB gz (+0,32); initial CSS 17,52 KB gz (+0,08).
- **Package:** `npm run release:package` → **73 entries, 14.792.111 bytes, SHA-256 `cd09543ce3d882f07aeddd5d357b763203b105eb631c860e8cee9d591327fda2`**; `shasum -c` OK; a second packaging to `/tmp` gives the same SHA; the content matches `apps/web/dist` (except `.vite`); `geology-context-v1/index.json` identical to the artifact; no keys. Previous SHA: `30b2b119…`.
- **Browser** (Chrome, port 4731, 1440×900, 1280×800 and 390×844; `/tmp/claude-pw/geo4731/walk.mjs`): on the build, all correct; on the ZIP under `/AnalogOS/`, **96/96**; without external network, **32/32** (only blocked host: `gibs.earthdata.nasa.gov`). Includes “Geology” sheet and its export, Metrics and Sources, 2D and back, Mission without key (0 calls in the manual walkthrough; 1 with fingerprint on pressing), simulated `/api/ai` with the server's real handler (result unchanged, export with provenance), obsolete geological channel and “Retry without geology”, and on mobile the popover, Reading and the S2 “Your mission” tab. 0 app errors and no horizontal overflow.

### Files changed

- `apps/web/src/components/planner/ResultView.tsx` (`CompactGeology`, `COMPACT_GEOLOGY_WHERE`), `features/composer/mission.css`, `features/composer/MissionGeologyView.test.tsx`, `shell/Tabs.tsx`, `shell/shell.css`, `shell/detail/geology.css`, `tests/shell.test.tsx`.
- `project/STATUS.md`, `project/CHANGELOG.md`, `docs/INTEGRATION_PLAN.md`, `docs/DEMO_ACCEPTANCE.md`, `submission/analogos-static.zip(.sha256)`.
- No changes to `shared/`, `server/`, `api/`, `apps/web/src/mission/`, `GeologyGuidance`, `GeologyContext`, artifacts, CI or dependencies.

### Real blockers

- **`origin/dev` advanced** from `d2252b6` to `e074762` (`e074762` “Presents AnalogOS as a product and separates the technical guide [skip ci]”, documentation only: `README.md`, new `docs/DEVELOPMENT.md`, `project/{CHANGELOG,NEXT_TASK,STATUS}.md`, `project/tasks/README_PRODUCT.md`). Pushing this branch to `dev` is now **not a fast-forward**: it must be merged first. `git merge-tree` anticipates conflicts only in `README.md`, `project/CHANGELOG.md` and `project/STATUS.md`.
- ADR-013 and ADR-014 require human acceptance; `CLAUDE.md:34` requires the one-line change described above.
- Without a real key, Anthropic was not tested with the integrated interface.

### Exact next three steps

1. `git merge origin/dev` (`e074762`) in `feature/mision-redesign`: resolve `README.md` (keep the team's product presentation and move the technical parts of the integrated interface to `docs/DEVELOPMENT.md`), `CHANGELOG.md` and `STATUS.md` (keep both branches); repeat `npm run verify` and `npm run release:package` (the ZIP does not include the README; the SHA should not change).
2. `git push origin feature/mision-redesign:dev` (fast-forward, without `--force`) and continue `gh run watch` of `vercel-deploy.yml`.
3. In `analogos-dev.vercel.app` with an authorized session: real “Highlight reasons with AI” with the geological checkbox (AR6 sector), open the “Your mission” fold, download the JSON with geological guidance and validate it with `validateAnyMissionExport`.

**Handoff:** Codex can resume by reading `prompts/RESUME_CODEX.md` and `project/STATUS.md` (this block and the merge block), with `docs/INTEGRATION_PLAN.md` §11 as context.

## Merge of M9/M10 into the integrated interface (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Request:** merge `origin/dev` (`92392f1` → `d2252b6`, 7 M9/M10 commits) without squash or `--force`, keep the team's work intact and port its UI to the integrated interface with the same texts and guarantees. **Push to `dev`: not done.** Local `dev` and `main` were not touched.

### What works

- **Sheet · “Geology” tab** (520 px rail and S2 sheet, after “Origin”): the team's `GeologyContext` panel as is: coverage status, bar and figures (covered, no coverage, overlap, no description), scale, authority, original units, provenance with hash of each request, field questions and “Download geological context (JSON)” (`<site_id>-geology-context.json`). Without a package: “not available”, and the rest of the sheet does not change.
- **Context-dependent texts:** in “Metrics”, the geological criterion (still “to be calculated”, outside the score) says “The official geological context is available… Calibration is missing…”. In “Sources”, the historical limitation points to the “Geology” tab. The snapshot texts do not change.
- **Mission · geological guidance:** after evaluating, “Your mission” shows “Geological guidance for this test” (the team's `GeologyGuidance`): general without AI or “AI selection”, with limits, linked official source, units and “Download JSON with geological guidance” (M10 wrapper, with the M8 export 1.0 inside). The printable report includes it (`PrintGeology`).
- **Reading · optional AI:** next to “✦ Highlight reasons with AI” is the checkbox “Include geological guidance for the test” (active by default). There is a single sending notice and it changes with it. Without context: “Geological guidance with AI not available: …”. If only the geological channel fails: “Retry without geology”. The texts are those of the team's `AiPanel`, and a test verifies it.
- **Guarantees:** the mission controller carries the team's `usePlanner`. The context fingerprint is sent only with the checkbox checked. The closed catalog comes from the current evaluation. The team's reducer discards any selection that does not match the context, the catalog, the request or the evaluation. The AI does not change `state.result`: recalculation gives the same fingerprints, statuses and ranks.
- **Without AI or in the ZIP:** the manual walkthrough is complete and does not call `/api/ai`. On pressing the button without a key, the AI appears as “not available”, and the template and general guidance continue.

### How to run it

- `npm install`; `npm run dev`. Local AI only with `.env` (`docs/AI_SETUP.md`).
- Verification: `PATH=/ruta/a/venv-py311+:$PATH npm run verify`. M9/M10 need `shapely` and `pyproj`: `pip install -e ".[dev]" pillow`.
- Delivery: `npm run release:package` and then `(cd submission && shasum -a 256 -c analogos-static.zip.sha256)`.

### Tests performed

- `npm run verify`: **pytest 328 pass, 5 skipped**; `typecheck:server` correct; **vitest 779 pass, 3 skipped** (real AI opt-in) in 61 files; build correct.
- New tests: `shell/detail/GeologyTab.test.tsx` (ports the two blocks from `geologyContext.test.tsx` that used `CandidateDetails`, with the same texts), `features/composer/MissionControllerGeology.test.ts` (opt-in, fingerprint, catalog, discard, retry, context change, identical recalculation and exports validated with `validateAnyMissionExport`) and `features/composer/MissionGeologyView.test.tsx` (compact “Your mission” and report). Extended: `ReadingView.test.tsx` (checkbox, conditional notice, retry and text parity with the team's `AiPanel`) and `shell.test.tsx` (tab).
- Team tests unchanged: `aiGeology`, `geologyGuidance`, `plannerGeology`, `plannerState`, `plannerUi`, `aiLive`, `aiServer`, `missionEngine` and `test_geology_*`. In `geologyContext.test.tsx` only the two ported blocks were removed, with a comment indicating where they are.
- **Browser** (Chrome, production build on port 4701): 56 checks passed at 1440×900 and 390×844, and another 56 with the ZIP served under `/AnalogOS/`. The “Geology” card and its export (validated JSON), “Metrics” and “Sources”, the switch to 2D and back, and Mission without a key were walked through (manual walkthrough with 0 calls; on click, 1 call with fingerprint and “not available”). Also `/api/ai` simulated by interception, with the **server's real handler** and the real package; only the provider was simulated. Results: “AI selection” with fallback and limits, the result unchanged, export with provenance, obsolete geological channel with 409 and “Retry without geology” without fingerprint, and on mobile “Your mission”, the Reading and the S2 “Your mission” tab. There were 0 app errors and no horizontal overflow. Without external network (ZIP): 24 checks passed, and the only blocked host was `gibs.earthdata.nasa.gov` (optional tiles).
- **Weight:** entry chunk 123,65 KB gz (+0,75). Initial CSS 17,44 KB gz (unchanged: the geological styles are loaded with the tab). Deferred: `GeologyTab` 2,8 KB gz + 1,0 KB gz of CSS; the geological validator with Ajv (46,4 KB gz) is shared with the mission chunk and is requested at an idle moment after the snapshot.
- **Package:** `npm run release:package` → **73 entries, 14.789.257 bytes, SHA-256 `30b2b1191489898b91e85aaf26f93104da62bc733d854ae0352e517bf2517c9c`** (`shasum -c` OK). Two packagings at `/tmp` give the same SHA. Each entry matches dist byte for byte, `geology-context-v1/index.json` is identical to the artifact and there are no secrets. Previous delivery SHA: `c5904c66…` (integration without M9/M10). The team's in dev: `f76a9055…`.
- **Invariants:** no differences from `origin/dev` in `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, root `package.json` and `package-lock.json`, `tsconfig.server.json`, `apps/web/src/mission/`, the artifacts (`geology-context-v1`, `science-v2/v3`, `demo`, `visual-context-v3`), evidence, the team's ADR-010/011, `GeologyContext`, `GeologyGuidance`, `usePlanner`, `loadGeologyContext` or the cited team tests. `apps/web/package.json` differs since the previous integration: `build` runs `build-validators.mjs --check`; `vercel build` + `check-vercel-function.mjs` verified. Also differing, since the redesign, are `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` and `contracts/reference-analog.schema.json` (base maps and scenario references, not scientific artifacts).

### Changed files (summary)

- New: `data/loadAppGeology.ts`, `domain/geologyCopy.ts`, `shell/detail/GeologyTab.tsx`, `shell/detail/geology.css` (M9 styles moved from `styles.css`) and the three named tests.
- Adapted: `App.tsx` (deferred loading), `shell/{appData,public,AppShell}.ts(x)`, `shell/detail/{FullDetail,SourcesTab}.tsx`, `features/metrics/MetricDetails.tsx`, `features/composer/{missionController,runLoader,composerStore,MissionPanel,PrintContent,index}.ts(x)`, `features/analysis/{ReadingView,explanationToReading,analysis.css}`, `state/mission.ts` (`geologyCatalog`), `components/planner/{ResultView,PlannerView,PlannerPanel}.tsx`, `scripts/package_release.py` and `tests/test_release_package.py` (both branches).
- Removed again, with their changes ported: `components/CandidateDetails.tsx` and `breakdown/ScoreBreakdown.tsx`.
- Documentation: `docs/INTEGRATION_PLAN.md` §11, `docs/BUILD_CONTRACTS.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_ACCEPTANCE.md`, `README.md` and renumbered ADRs.

### New decisions

- **Renumbered ADRs:** the team uses ADR-010 (geological context, accepted) and ADR-011 (geological guidance). Ours become **ADR-014** (fixed scenario, proposed) and **ADR-015** (client-side recalculation, superseded). ADR-012 and ADR-013 do not change. The historical blocks of this file and of the CHANGELOG keep the numbering of their date.
- **A single AI action:** the geological checkbox goes in the Reading, next to “Highlight reasons with AI”, and the guidance is shown in “Your mission”. The compact “Your mission” does not repeat the `AiPanel`, as in the previous integration. One line indicates where to request the AI selection.
- **Deferred loading of the geological context:** the team's validator uses Ajv at runtime, so it goes in a deferred chunk that is requested at an idle moment. `AppData.geology` is optional: absent means “loading”.
- In “Sources”, the replacement of the limitation says “in the “Geology” tab” instead of “above”, because the panel is no longer above the list.

### Real blockers

- The push to `dev` (which deploys to `analogos-dev.vercel.app`) was not done in this step.
- ADR-013 and ADR-014 require human acceptance.
- Without a real key, Anthropic was not tested. The geological channel was tested with the real handler and the simulated provider.

### Next three exact steps

1. `git fetch origin` and confirm that `origin/dev` is still at `d2252b6`. If it has advanced, merge and repeat `npm run verify` and `npm run release:package`.
2. `git push origin feature/mision-redesign:dev` (fast-forward, without `--force`) and continue `gh run watch` of `vercel-deploy.yml` (build, `check-vercel-function`, deploy and alias).
3. In `analogos-dev.vercel.app` with an authorized session: real “Highlight reasons with AI” with the geological checkbox (AR6 sector as in M10), download the JSON with geological guidance and validate it with `validateAnyMissionExport`.

**Handoff:** Codex can resume by reading `prompts/RESUME_CODEX.md` and `project/STATUS.md` (this block), with `docs/INTEGRATION_PLAN.md` §11 as context for this merge.

## Integration review: findings fixed (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Request:** “merge into dev and push.” Three reviews of `e568d9d` (scientific and AI honesty; visual walkthrough 1440/1280/390; team non-regression) left 25 findings: 2 high, 11 medium and 12 low. The high ones, the medium ones and 9 low ones were fixed. **Push to `dev`: not done in this step.**

### What changed (and how it was verified)

- **High · Reading:** “All requirements are met…” no longer depends on what the AI chose. `explanationToReading` computes `emptyNote` and `omitted` with the evaluation. With an empty AI selection it reads “The AI did not highlight reasons for 7 places; the calculation blockers are in “Result”” and the 7 places are listed (vitest and Chrome with simulated `/api/ai`).
- **High · “Your mission” ≥1440:** without a current result (`data-focus="mission"`), the planner takes up the panel and the Reading a strip of ~22 %. In the compact variant, example and text go on top, the route cards lose the description and “Next →” stays fixed at the bottom. Measured at 1440×900: gap of 576 px (before 344); “Load an example” at 271–305, text at 396–485 and “Next” at 534–568, everything in view without inner scroll. With a result, the 45 % / remainder split returns.
- **Medium · order:** the reasons follow the evaluation order even if the AI reverses the selection. In Chrome this was tested with the selection reversed: #1…#4 come out, followed by the non-prioritized ones. The checks remain in the AI's order, as their label says.
- **Medium · REF in Mission:** `shared/mission/evaluate.ts` (unchanged) can give the REF a rank. Now the REF always carries “REF” on the rail, the S1 sheet, the carousel and the globe, and does not count in “N of M candidates prioritized” or in the carousel title (“+ REF”). `referenceNeverRanked.test.ts` adds 6 Mission cases (slope ≤ 10° prioritizes Yungay).
- **Medium · ✦:** it was removed from the pill, from the Mission form (and its pulse), from “Refine”, from the Reading skeleton and from the “Your mission” loading. There are tests that check it, also on the static HTML.
- **Medium · “Send”:** focus goes to the loaded text even if the step was already open, and the status line says “Text loaded in “Your mission”…”. In Chrome, on two consecutive sends with the panel scrolled, focus stayed in the textarea, which stayed in view. 0 AI calls.
- **Medium · AI wait:** the phase no longer appears in the top-left corner, above the logo. The orbit remains around the globe and the composer shows the phase.
- **Medium · labels and 2D:** name and status are shortened with “…”, never the rank or the %. `CandidateFlatMap` writes `--pin-x`. At 390 px the 2D label ends at x=382 (before 507) and at 1440 it does not overflow (`scrollWidth == clientWidth`).
- **Medium · carousel:** the title no longer shrinks. On narrow cards, short forms are used (“#2 · Prioritized”, “Conf. 77,5”, “Feasib.: pending”) and the full form remains in the accessibility tree. “similarity v3” is fully visible and the figure fits in the ring (measured at 1440, 1280 and 390, with no clipping).
- **Medium · Sources:** “Download card (JSON)” uses `buildExport`. In Chrome, the download brings `exported_from, notice, site, search_context`.
- **Medium · privacy:** the `title` of “Delete all” in “Your mission” no longer says that nothing is stored, because there is a local history, and it explains how to delete it. The team's `PlannerPanel` keeps its text.
- **Low fixed:** “confirmed by you” after confirming AI requirements. The AI provenance remains visible with the Reading dimmed and the label carries a single ✦. With an unsupported objective, the ring says “not applicable”. The “Metrics in the panel →” chip goes below the ring (in Chrome it does not overlap with the label). Texture preloading uses `crossorigin` (1 download per texture and 0 warnings; before 2). Suggestions are hidden while the popover is open. “status · mission-rules-1.0.0 rules” replaces “team rules” (now forbidden in `copy.test.ts`). The delivery ZIP has been regenerated. The demo script and “M8 Walkthroughs” are up to date.

### Low not fixed (with reason)

- `aiLive.test.ts` does not compare the server's fingerprints: it is a team test that needs a real key to run. It cannot be run here, so it was not modified blindly. It remains for the team: compare `evaluation_fingerprint` and `request_fingerprint` and pass the response through `explain_ok`.
- The mobile line ends at the legend: returning `null` when a panel clips it would always remove it at 390 px, because the legend is always between the pin and the sheet. It is a design decision. It was tested and reverted.
- 2D without network still requests GIBS tiles: it only generates console noise, the view works with the local copies.

### Tests performed (this step)

- `npm run verify`: **pytest 190 pass, 4 skipped**, `typecheck:server` correct, **vitest 624 pass, 2 skipped** (real AI opt-in) in 53 files, and build correct. Entry chunk: 122,9 KB gz (+0,7). Initial CSS: 17,4 KB gz.
- New or extended tests: `explanationToReading`, `ReadingView` (empty selection, provenance with the Reading dimmed, skeleton without ✦), `Composer` (✦, popover, “Delete all”, “confirmed by you”), `MissionController` (focus on the text), `PlaceRail` (unsupported, rules label, short forms), `SourcesTab.test.tsx` (new), `referenceNeverRanked` (Mission), `layoutLeaders` (chip below the ring) and `boot`.
- Chrome (playwright-core, port 4631, production build): full walkthrough of Explore and Mission at 1440×900 with real network (Origin, Method with 50 windows, header and Sources export, switch to 2D, Mission without a key with 0 AI calls, JSON, dimmed editing and out-of-coverage diagnosis). Result: `ERRORS []`. Also: offline Mission flows in 1440 and 1280 (only the expected 404 from `/api/ai`), simulated AI (draft and explanation), and on mobile 390×844 Explore, Mission, sheet and 2D, with no `pageerror` or horizontal overflow.
- Package: `npm run build` + `package_release.py` to `/tmp` twice, identical. Then `npm run release:package` in `submission/`: **66 entries, 14.508.759 bytes, SHA-256 `c5904c66c84ca6d8dfc480f4ad1841b09015a343f63e5bea19d822a54d0f99f8`** (`shasum -c` OK). Served under `/AnalogOS/` without external network, in 1440 and 390: Explore and manual Mission work, and the JSON is valid against `mission-export.schema.json`, with `ai.draft` and `ai.explanation` in `null`.
- Invariants: no differences from `origin/dev` in `shared/`, `server/`, `api/`, `apps/web/src/mission/`, `tsconfig.server.json`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, `package.json`, `package-lock.json`, `artifacts/science-v2`, `artifacts/science-v3`, `artifacts/demo`, or in the team's tests (`aiLive`, `aiServer`, `missionEngine`, `plannerState`, `plannerUi`, `test_discovery.py`). No secrets in the diff or in dist.

### New decisions

- The REF keeps the rank given to it by the team's engine, always labeled. Sorting only `role !== 'reference'` in `shared/mission/evaluate.ts` (ADR-008 §6) is left to the team and requires updating `ORDERING_RULE`, `missionEngine.test` and the export fixtures.
- Composer line: "N of M prioritized candidates", not counting the REF. The team's `ResultView` still says "N of 7 areas", which does count the REF as an area.

### Next three exact steps

1. `git fetch origin` and confirm that `origin/dev` is still at `92392f1`. If it has advanced, merge and repeat `npm run verify`.
2. `git push origin feature/mision-redesign:dev` (fast-forward, without `--force`) and follow `gh run watch` of `vercel-deploy.yml`.
3. In `analogos-dev.vercel.app` with an authorized session: test the real AI ("Propose requirements with AI" and "Highlight reasons with AI"), export the JSON and decide the REF in `evaluate.ts`.

## Integration of the redesign with dev (Claude Code, branch `feature/mision-redesign`, 2026-11-14)

**Request:** the user asked "merge into dev and push" and decided to integrate: the interface is that of the redesign (ADR-010) and internally the deterministic planner, Anthropic's AI and the team's v3 data are used (ADR-008, ADR-009). Plan: `docs/INTEGRATION_PLAN.md`; decision: ADR-013 (proposed). **The push to `dev` is a separate step; it was not done in this session.** Base: `origin/dev` `92392f1`, merged without squash (merge `44feec6`).

### What works

- **Explore v3:** 6 candidates with their global rank and the known reference (Pampa Yungay) labeled "REF", never with a number, in the carousel, the globe, the rail, Compare and the Reading; "All / Chile / Argentina" filter that preserves the global rank; CL+AR outline labeled "Reference outline, not an official boundary"; globe centered on the two regions; chip "Snapshot v3 · 6 candidates · 1 REF · 7 ◆ to be calculated"; product promise in the carousel. Detail sheet with an **Origin** tab (the team's "Origin and background" block), "Export sheet (JSON)" (`buildExport`) and "Evaluate this sector"; **Method** with "How they were searched" (50 windows, regions, SVG map and auditable links).
- **Mission on top of the team's planner:** a single controller (deferred chunk) with `plannerReducer`, `evaluateMission`, `aiClient` and `buildMissionExport` unchanged. "Your mission" mounts `PlannerView` (separate from `PlannerPanel`, which keeps its signature) in compact variant. "Send" opens the requirements with the brief and **does not call the AI**; "Use example", "Add requirement: …" (no value) and "Evaluate a sector…" as suggestions. After confirming and evaluating: carousel grouped by status, globe with #rank / ○ / ✕ / out of scope (no %), rail with the requirements layer (✓ ✕ ○, required, observed, reason), Tesla lines sorted by requirement, "Download JSON", "Print report" (one report per page) and exportable out-of-coverage diagnostic. Editing after evaluating invalidates and aborts the AI in progress; results stay dimmed until re-evaluated.
- **Three-layer Reading:** result (`MissionEvaluation`), highlighted reasons (deterministic template without ✦ or "✦ Highlight reasons with AI", validated by the reducer) and snapshot facts (without the `^cl-` filter, REF separate, robustness of `analysis-summary.json`). In Explore it is "Deterministic Reading", with no AI.
- **Without AI or in the ZIP:** complete manual flow; the AI buttons show "not available" and the export carries `ai.draft` and `ai.explanation` in `null`.

### How to run it

- `npm install`; `npm run dev` (local AI only if there is `.env` with `ANTHROPIC_*`, see `docs/AI_SETUP.md`).
- Full verification: `PATH=/ruta/a/python311+:$PATH npm run verify` (pytest, `typecheck:server`, vitest and build).
- Package: `npm run build && python scripts/package_release.py --zip <ruta>.zip --checksum <ruta>.zip.sha256`. `npm run release:package` without flags writes `submission/analogos-static.zip`.

### Tests performed (2026-11-14)

- `npm run verify`: **pytest 190 pass, 4 skipped** (require `data/raw`); `typecheck:server` correct; **vitest 603 pass, 2 skipped** (real AI opt-in) in 52 files; build correct.
- Team tests intact: `aiServer`, `aiLive`, `missionEngine`, `missionGeometry`, `plannerState`, `plannerUi`, `missionFormat` and `tests/test_discovery.py` with no differences from `origin/dev`. In `discovery.test.tsx` only the path of `CandidateMap` changed; the "ranking and sheet" block was **ported** with the same texts to `features/places/PlaceRail.test.tsx` and `shell/detail/OriginSection.test.tsx`.
- New: `MissionController`, `explanationToReading`, `facts`, `bundleParity` (web bundle = server `loadTrustedBundle()`), `referenceNeverRanked`, `copy`, `OriginSection`, `contractFixtures` (◆ catalog). Removed: own engine, lktron, NDJSON, tokens, FNV, pregenerated, TS↔Python parity of the own engine and lktron contracts.
- Smoke test of `/api/ai` (`vite preview`, without `.env`): GET → 405 `method_not_allowed`; POST `draft` → 503 `ai_unavailable` with `cache-control: no-store`.
- Package in `/tmp/claude-rel/integ.zip` (`submission/` was not touched): **66 entries, 14.500.565 bytes, SHA-256 `ee50dc4b7aa47aac59286d489647f8b96e07d0fe3da439b243385e98e95ec1bc`**, identical across two runs and cross-checked against dist. Previous SHA of the dev delivery (`submission/analogos-static.zip`, UI `9060970`): `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`. Opened under `/AnalogOS/` with all external network blocked: Explore, manual Mission, AI "not available" and exported JSON valid against `mission-export.schema.json`. `file://` is not guaranteed (ADR-004).
- Browser (Chrome, port 4601) at 1440×900 and 390×844:: Explore with REF and filter, selection with rail and lines, Origin, Method (50 windows), export sheet, switch to 2D, Mission without key (0 calls to `/api/ai` in the manual flow), evaluation, JSON, editing that invalidates and out-of-coverage point with diagnostic. **0 app errors in the console**; the only resource errors are 500 for optional NASA GIBS tiles in 2D and the 404 for `/api/ai` on the static server (expected). No horizontal overflow on mobile.
- Weight: entry chunk 122,2 KB gz (+10,3 compared to 112,0 in `9b32457`, within +12); initial CSS 17,1 KB gz (+1,8). The Ajv compiler is not in the entry chunk: planner, AI client and `shared/mission/validate` go in the deferred mission chunk (52,4 KB gz); v3 search and background in a separate chunk (9,1 KB gz).
- Invariants: `git diff --quiet origin/dev` on v1/v2/v3 artifacts, configs, team contracts and the v2 ZIP → unchanged; `shared/`, `server/`, `api/`, `tsconfig.server.json`, `vercel.json`, `.github/` and `check-vercel-function.mjs` → unchanged; root `package.json` and `package-lock.json` identical; no secrets or `VITE_ANTHROPIC*`/`VITE_LKTRON*`.

### Changed files (summary)

- New: `domain/{criteria,snapshotContracts,discoveryContracts,missionView,sensitivity}.ts`, `features/composer/{missionController.ts,printHost.tsx,PrintContent.tsx}`, `features/analysis/{facts,explanationToReading}.ts`, `components/planner/PlannerView.tsx`, `shell/actions.ts`, `shell/detail/OriginSection.tsx`, ADR-013 and the tests named above.
- Adapted: carousel, markers, rail, lines, Reading, composer, "Your mission", detail sheet, Method, Compare, startup, `state/{mission,ui}.ts`, `loadDemoSnapshot` (precompiled validators), `loadingHints` (v3 preload), `package_release.py`, `test_release_package.py`, `ResultView` (optional prop `compact`), `PlannerPanel` (wrapper).
- Removed: `features/engine/**`, `features/analysis/{lktron*,ndjson,eventGate,analysisTokens,TokenText,factIds,fnv,pregenerated,controller,readingStore,runtime,evidencePacket}`, `domain/{aiContracts,interpretationContract}.ts`, `interpretation`/`mission` validators, `contracts/{mission-interpretation,evidence-packet,ai-analysis}.schema.json` with its fixtures, `tests/{test_ai_contracts,test_engine_parity}.py`, `tests/fixtures/engine/`, `scripts/make_pregenerated_analysis.py`, `artifacts/analysis/`, and from dev `components/{CandidateDetails,CandidateRanking,CandidateGlobe,CandidateFlatMap,MapStage,LiquidNav}.tsx` and `breakdown/ScoreBreakdown.tsx`.

### New decisions

- ADR-013 (proposed): the redesign UI hosts the planner; precompiled validators in the main chunk and Ajv at runtime only in the mission chunk; three-layer Reading; no automatic AI calls; the no-AI flow requires manual requirements ("Use example" in one click).
- Renumbered ADRs: fixed scenario 008→**010** (proposed); client-side recalculation 009→**011** and lktron AI 010→**012**, both **superseded** by the team's ADR-009.
- Deviations from the plan, explained: the controller uses the same reducer over an external store instead of `usePlanner` (avoids a render delay in controlled fields; `usePlanner` stays intact); the "out of scope" group is visible and dimmed, not collapsed (an APG listbox does not support collapsible groups); `aiContracts.test.ts` and `test_ai_contracts.py` were kept as `contractFixtures.test.ts` and `test_contract_fixtures.py` so as not to lose the coverage of the ◆ catalog; the ZIP was generated in `/tmp` per the task instructions.

### Real blockers

- ~~`submission/analogos-static.zip` (`eacf5dce…`) is still the one from the dev UI (`9060970`)~~ — resolved in the review: regenerated with the integrated interface (`c5904c66…`, block above).
- The push to `dev` (which deploys to `analogos-dev.vercel.app` via Actions) was not executed in this session. Remote verification of the real AI is left to the team or to the publication step.
- ADR-010 and ADR-013 require human acceptance.

### Next three exact steps

1. `git fetch origin` and check that `origin/dev` is still at `92392f1` (or merge its new commits); regenerate `submission/analogos-static.zip` with `npm run release:package` and record the SHA.
2. `git push origin HEAD:dev` from `feature/mision-redesign` (fast-forward, without `--force`) and follow `gh run watch` of the `vercel-deploy.yml` workflow (build, `check-vercel-function`, deploy and alias).
3. In `analogos-dev.vercel.app` with an authorized session: real "Propose requirements with AI" and "Highlight reasons with AI", and export the JSON with `ai.draft` and `ai.explanation` present.

**Handoff:** Codex can resume by reading `prompts/RESUME_CODEX.md` and `project/STATUS.md` (this block), with `docs/INTEGRATION_PLAN.md` and ADR-013 as context for the integration.


## Documentation maintenance — product README

- Dan requested orienting the README toward the product and reducing event content. Codex reorganizes problem, users, flow, evidence, scope and local access; operation and reproduction move to `docs/DEVELOPMENT.md`.
- The old claim of national coverage is corrected: the scope remains the two-region pilot, six candidates and Yungay as the reference. No changes to code, data or the M10 deployment.
- Assignment and verification in `project/tasks/README_PRODUCT.md`. M10 remains accepted; Claude has no new assignment.
- Accepted content: 34 relative links checked; 316 Python and 332 web correct (3 opt-in skipped), typecheck/build correct. Documentation published with `[skip ci]`; local `outputs/` excluded.

## Current delivery — M10

- Code deployed `4708b42b4bd152dca74d3e009f233a910e458d8b`; Actions 43665786554 correct; https://analogos-dev.vercel.app/. Later checkpoint documentation/evidence only with `[skip ci]`. Main not modified by this delivery.
- Claude implemented and corrected under Codex's review. SERNAGEOMIN/SEGEMAR sources, target-linked checks, visible coverage/scale/limits and auditable export. Single retry on invalid selection, total deadline preserved; without changing score, requirements, evaluation or scientific data.
- 316 Python and 332 web correct; typecheck/build, real mobility/sampling contrasts, wrapper integrity and M8/M9 regression. 33 protected files intact. Real Vercel function tested before deployment.
- Real AI in dev: AR6, three checks with SEGEMAR units, traction pending. Downloaded report validated and rebuilt identically with official data. Evidence/screenshot: `submission/evidence/m10-dev-geology-export.json`, `submission/assets/analogos-m10-dev.jpg`. Detail: `docs/DEV_AI_VERIFICATION.md` and `docs/CODEX_M10_REVIEW.md`.
- Current ZIP: 31 entries, 13.255.407 bytes, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`. Local QA offline/subfolder, errors, mobile/keyboard completed; native printing pending.
- NEXT_TASK accepted; Claude has no new assignment. Do not start another milestone automatically. The following blocks are history, not the current status.

## M9 background — accepted and published

Official geological sheet and export across seven sectors; coverage/ambiguity and scale explicit. Data/code review and offline browser, 390 px/keyboard, loading errors, and real download completed. 316 Python and 246 web correct; typecheck/build; baseline49 intact. ZIP 31 entries, SHA-256 `eed868335c5374d20b05415a8627be9ec3f035c1dc10668bbe08f21e03f6520c`. See `docs/CODEX_M9_REVIEW.md`. Code deployed `34e76b9`; Actions 43658989969 correct. Remote geology and export verified; both real Anthropic operations correct and recalculated JSON identical. Screenshots and exports in submission; details in `docs/DEV_AI_VERIFICATION.md`. The subsequent documentation checkpoint does not change the deployment. No change to score, science, or geological AI.

## Authorized M9 assignment — geological context

- Dan approved the recommendation: «ok let's release it so that it is perfect and nothing breaks». Scope in NEXT_TASK: geological sheet, reproducible and offline acquisition/contract/export; science, rankings, and M8 AI preserved.
- Claude implements in phases with Codex checkpoint/review. No lithological map, new filters, or geological score. Codex will perform acceptance and release to dev after verifying; main is preserved.
- New baseline: `/tmp/analogos-m9-baseline-hashes.json`; M8 archived in `project/tasks/M8_MISSION_RECOMMENDATION.md`. Previous research preserved.

## M9 phase B — sheet, export, and portable package (Claude, under Codex review)

- Compact, expandable «Geological context» sheet in all seven sectors, `<site_id>-geology-context.json` export with a self-contained contract, validated optional loading (timeout includes the body; no calls to providers), and a packager with validated optional `geology-context-v1/index.json`. Does not change score, confidence, restrictions, AI, or M8.
- `npm run verify`: 316 Python, 245 web (+2 skipped), typecheck/build correct. `release:package` repeated identically: 31 entries, SHA-256 `579a4fed…74be`. Baseline of 49 files intact. Gaps: no browser QA (Codex), the web does not compute SHA-256. Details in `project/M9_PROGRESS.md`; ignored data: `data/raw/geology-context-v1/` (~6,9 MB).

## M9 phase A — geological context (corrected after Codex review)

- Real package `artifacts/geology-context-v1/index.json` (SHA-256 `fe2552dd…856c`), own contract, `python -m pipelines.build_geology_context [--refresh|--offline]` pipeline, ADR-010 proposed and `docs/GEOLOGY_CONTEXT.md`. States: Chile 1–3 and Yungay `partial` (≈99 %), Argentina 4 `partial` (50 %), Argentina 5 `no_coverage`, Argentina 6 `available`. They match the audit within 5e-5 pp. Repairs accepted, no masks.
- Review A corrections: change in total area in repairs, validation of each vertex, cache+package transaction with rollback, exact provenance per sector, strict cache and license. Package recalculated from the cache without network. Verification: 297 Python, 196 web (+2 skipped), typecheck/build correct; offline rebuild identical; baseline of 49 files intact.
- Phase A gap resolved in B: the packager now supports `geology-context-v1/`. Ignored raw: `data/raw/geology-context-v1/` (~6,9 MB).

## Post-M8 geological evaluation — Codex, 2026-11-14

- Dan asked to analyze effort and value first. Evaluation finished in `docs/GEOLOGY_FEASIBILITY.md`, with reproducible measurements in `docs/research/geology/`. No product integration was started, nor a task to Claude.
- Real downloads: SERNAGEOMIN distributed by MMA at 1:1.000.000 covers approximately 99 % of the four Chilean windows; SEGEMAR 250K covers 50 %, 0 %, and 100 % of the Argentine ones. More general alternatives verified separately; gaps, overlaps, and invalid geometries explicit.
- Recommendation: descriptive, traceable context per sector, estimated at 20–32 h of engineering/review; do not activate `geologic_relevance` or infer traction. Science, AI, UI, and publication data and code unchanged. Claude is still awaiting assignment.
- Ignored research cache: `data/raw/geology-feasibility-20261114/`, 13 files, 20.873.381 bytes. Exploratory dependencies isolated in `/tmp/analogos-geology-audit-libs`, without modifying app dependencies.
- Product verification: 177 Python and 196 web correct, 2 real AI tests skipped; typecheck/build correct. The coverage audit is not field validation.

## M8 background — dev and real AI verified

- URL: https://analogos-dev.vercel.app/. Code deployed `9060970ecf71e3c68f7b11a8d220e37e49057dc8`; Actions 43639834860 correct. The subsequent checkpoint only adds documentation/evidence with `[skip ci]` and preserves that verified deployment. Main is not published.
- Dan authorized pushing to dev and verifying the AI. The key is in GitHub Secrets, injected only at dev deploy runtime. Vercel protection preserved; key absent from code, bundle, ZIP, and evidence.
- Real browser test: Anthropic proposed three editable requirements and explained the confirmed evaluation. Example: regional slope ≤ 2,3°, non-vegetated surface ≥ 95 %, pending permits. Result: one prioritized window and six discarded. Downloaded JSON validated and evaluation identical to the local recalculation.
- Fixed failure of the first deploy (`707d4b1`, `ERR_REQUIRE_ESM`): pure core moved to `shared/`, web with re-exports, server with direct imports and NodeNext. CI tests the startup of the actually packaged function before deploying.
- Verification after the fix: 177 Python, 196 web (+2 real opt-in tests skipped by default), typecheck/build and Node startup correct. The 38 baseline hashes remain intact.
- Final ZIP: 30 entries, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`, repeated identically and cross-checked against dist.
- Current report: `docs/DEV_AI_VERIFICATION.md`. Evidence: `submission/evidence/m8-dev-ai-export.json`, screenshot `submission/assets/analogos-m8-dev-ai.png`. Configuration/rotation in `docs/AI_SETUP.md`.
- Delimited pending items: native printing (content/CSS checked), territory, bibliography, climate contrast, and user validation. Field suitability is not certified and no data were acquired for new geometries.
- The local acceptance and the two returns to Claude remain as history in `docs/CODEX_M8_REVIEW.md` and `project/M8_PROGRESS.md`. The following sections document M7 and earlier deliveries.

## Integration reviewed by Codex for dev

- Preserved the 3D globe, automatic switch to 2D map, liquid glass, floating sheet, magnitude breakdown, monthly series, and the team's deployment. The application loads v3 and its seven images; Yungay appears as REF, outside the six positions, also in globe, map, and selector.
- The Search section maintains the scope of 50 windows, the discards, country filter, and auditable SVG map. The Sentinel-2 series cover the seven sites; they do not intervene in the scores. No modification of formulas, weights, or v2/v3 scientific artifacts.
- ADR-006/007 preserved from the redesign; the discovery ADR becomes ADR-008. `CLAUDE.md` reflects the current stack. The v2 ZIP updated by the team is preserved as historical; the eleven hashes of the v2 scientific baseline remain intact.
- Verification: `source .venv/bin/activate && npm run verify` → 177 Python, 69 web and build correct. `npm run release:package` → 30 files, 12.865.983 bytes, SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Repeated packaging identical and entries cross-checked against dist.
- ZIP review under `/AnalogOS/`: Argentine candidate and its real Sentinel-2 image on the 2D map, Yungay reference, Argentina filter, desktop and mobile view of 390 px without horizontal overflow. No application errors recorded on the local production server. Screenshot: `submission/assets/analogos-integrated-dev.jpg`.
- Large versioned files: ZIP v3, seven context PNGs, and the team's basemaps/textures. Raw data and credentials remain local and ignored. The map may use public GIBS as an optional enhancement; the core and the images are packaged.
- The authorization includes `dev`; it does not change the scientific scope or start a new task for Claude. Next steps: official territorial cross-check, complete Puna bibliography, and local climate contrast.


## Merge into `dev` (2026-11-14, Claude, direct team decision)

- The complete redesign (liquid glass, background globe with switch to 2D, floating sheet, score breakdown, Sentinel-2 series) is in `dev`. Closing commit and push to `origin/dev`.
- Verification: `npm run verify` → 128 Python pass and 1 is skipped, 52 web and build green; `npm run release:package` → ZIP of 24 files, SHA-256 OK. Python 3.11+ required: the system `python` (3.10) will not work; use a venv with `pip install -e .[dev] pillow`.
- Decisions: ADR-006 and ADR-007 (globe, formerly ADR-004) accepted by the human team without Codex review.
- Pending: update in `CLAUDE.md` the line «local SVG map; no MapLibre or WebGL», which no longer reflects the product.

## Active working model

- Dan authorized expanding the vision to global AnalogOS, searching for candidates in Chile and Argentina, and keeping Yungay as the known reference. Assignment `M7-GLOBAL-DISCOVERY` accepted; Claude awaits a new assignment. The v2 delivery below is historical. The later authorization allows updating `dev`.

- Codex leads product, science, architecture, priorities, review, and release.
- Claude implements only tasks assigned in `project/NEXT_TASK.md` and delivers in `review` status.
- The implementation branch is `dev`; `main` is reserved for reviewed deliveries.
- Assignment `M6-RELEASE-REVIEW`: accepted by Codex.
- Assignment `M6-PORTABLE-RELEASE`: implemented by Claude, corrected after review, and accepted by Codex (12:44). Dan authorized its commit and push to `dev` (12:48); Claude awaits a new assignment.

- Assignment `M4-VISUAL-EVIDENCE`: implemented by Claude, corrected after review, and accepted by Codex (13:54). Dan authorized its commit and push to `dev` (14:15); Claude awaits a new assignment.

## M7 delivery accepted (Codex, 15:33)

Independent review in `docs/CODEX_M7_REVIEW.md`: 167 Python tests, 39 web and build; scores and selection recalculated, v2/v3 rebuild byte for byte, caches without network, deterministic ZIP, and browser at root/subfolder. ADR-008 accepted. Software acceptance does not certify novelty or field suitability.

AnalogOS with Chile–Argentina pilot. Real search over 50 windows of ~20 km in two test regions; six preselected candidates and Yungay as the known reference, outside the ranking.

| Role | Site | Similarity | Confidence | Stability | Feasibility |
|---|---|---:|---:|---:|---|
| Candidate 1 | `cl-win-s2500-w06970` · 25,0° S, 69,7° W | 94,87 | 77,45 | 99,33 | requires review |
| Candidate 2 | `cl-win-s2480-w06950` · 24,8° S, 69,5° W | 91,87 | 77,45 | 99,03 | requires review |
| Candidate 3 | `cl-win-s2520-w06950` · 25,2° S, 69,5° W | 90,35 | 77,36 | 99,08 | requires review |
| Candidate 4 | `ar-win-s2620-w06750` · 26,2° S, 67,5° W | 63,85 | 77,00 | 95,88 | requires review |
| Candidate 5 | `ar-win-s2640-w06730` · 26,4° S, 67,3° W | 53,68 | 77,25 | 96,81 | requires review |
| Candidate 6 | `ar-win-s2580-w06710` · 25,8° S, 67,1° W | 49,43 | 77,40 | 96,81 | requires review |
| Reference | `cl-pampa-yungay-screening` | 75,67 | 77,45 | 99,03 | requires review |

- Stage 1: 50 windows evaluated (≈ 22.274 km²); 4 excluded for containing published sampling coordinates, 2 for proximity, 38 outside the quota, 6 preselected.
- No candidate is declared new: both regions have prior records and all six remain as `regional_precedent`.
- The Argentine candidates drop mainly because of the POWER climate context (MERRA-2 cell larger than the window); no weights or values were changed.
- The seven Sentinel-2 images show traces and structures to be cross-checked; they are included as a warning in each record.
- Snapshot v2, visual package v2 and ZIP v2 are intact (`git diff --quiet HEAD` on them returns 0).
- New deliverable: `submission/analogos-static.zip` (18 files, 9.012.267 bytes, sha256 `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415`).
- Verified: 167 Python tests, 39 web tests, build, repeated packaging identical, demo over HTTP at `/AnalogOS/`.
- Details: `docs/DISCOVERY_REPORT.md`, ADR-008 (`accepted`) and the report in `project/NEXT_TASK.md`.

Next three steps: territorial cross-check with official IDE Chile and IDERA layers; literature review with full texts and Puna coordinates; local climate cross-check. They require a new assignment, without automatically expanding regions or weights.

## Integrated redesign — branch `redesign/planeta-3d` (2026-11-14 13:10)

Merges two branches: the 3D globe (`redesign/planeta-3d`) and the visual redesign (`redesign/liquid-glass`).

- **What works:**
  - Navy #02070A / blue #0297DE / orange #FC734D palette with glass surfaces.
  - Liquid navbar (WebGL drop, CSS fallback) with scroll-spy.
  - Global liquid glass (`apps/web/src/liquid/`): all surfaces have glass with a light border, a highlight that follows the cursor and SVG refraction in Chromium; background with drifting color blobs.
  - 3D Earth globe (three.js, Blue Marble) with a toggle to an SVG map and automatic fallback without WebGL; footprints in blue and the selected zone in orange.
  - "Surface signal" section: monthly Sentinel-2 2025 BSI and NDVI per sector, animated when the zone changes. Context only: they do not alter the score.
- **How to run it:** `npm run dev`, or `npm run build && npm run preview`.
- **Tests:** see "Verification performed". Manual review in headless Chromium with SwiftShader at 1440×900 and 390×844: with no horizontal overflow or console errors, except the pre-existing 404 for `favicon.ico`. Captures of `submission/assets/`, ZIP and `SHA256SUMS.txt` regenerated from this build.
- **Files:** `styles.css`, `App.tsx`, `components/{LiquidNav,SignalCard,SurfaceSignals,CandidateGlobe,CandidateMapView}.tsx`, `CandidateGlobe.css`, `domain/{surfaceSeries,globe}.ts`, `data/loadDemoSnapshot.ts`, tests `surfaceSeries` and `globe`, `vite.config.ts`, ADR-004.
- **Decisions:** ADR-007 (formerly ADR-004) extends the stack with three.js without retiring ADR-001. Monthly series do not enter the score and missing months are not interpolated.
- **Blockers:** none technical. Open: when zoomed in, the globe looks pixelated, because Blue Marble has ~10 km per pixel. Proposal evaluated, pending user decision: bake offline NASA GIBS patches, HLS S30 at 30 m per sector and MODIS at 250 m regional.
- **Next steps:** 1) ~~accept ADR-007~~ accepted by the team; 2) decide on the texture improvement with GIBS; 3) review on the actual presentation machine.

## Performance and preloading — branch `redesign/planeta-3d` (2026-11-14 14:55, Claude)

- **What changed:**
  - The globe is drawn on demand: 0 WebGL draws at rest, versus ~360 every 3 s before.
  - The navbar water drops to ~15 fps when there is no interaction.
  - 2K/1K textures: from 1,84 MB to 0,38 MB.
  - The globe, textures and 2D map are requested when the page loads; the 2D map is mounted hidden when the browser is idle, so the switch from the globe is instantaneous.
  - Immutable cache on Vercel for `/assets/*` (`vercel.json`).
- **Measurements** (Chromium with Metal GPU, simulated 8 Mbps network): globe with labels from 3,2 s to 1,7 s; 2D image immediate when crossing the threshold (previously 273 ms and only the regional layer).
- **Packager:** `scripts/package_release.py` accepts the deferred chunks and assets reachable according to `.vite/manifest.json`, which does not go into the ZIP, and `basemaps/` with fixed names. Anything the manifest does not reach continues to be rejected.
- **Tests:**
  - Python: 128 pass and 1 is skipped, including those of lktron (visual context and packager, plus 7 new ones).
  - Web: 52 pass; build and `git diff --check` clean.
  - `package_release.py` produces a ZIP of 24 files with checksum OK.
  - The unzipped ZIP under `/AnalogOS/`, with no external network, works without failures: globe, 2D, lktron panel and candidate switching.

## Layout redesign — branch `redesign/planeta-3d` (2026-11-14 15:30, Claude, direct request from the team)

- **What works:** the globe is the site background. When zooming in, it switches by itself to a 2D map with official imagery and returns when zooming out; there is no 3D/2D selector. The legend indicates the visible source. There is no longer a candidates column: a 1·2·3 selector in the record, which floats in liquid glass. The Sentinel-2 from ADR-005 is drawn over each polygon in the 2D view. Without WebGL the SVG is used.
- **How to run it:** `npm run dev`. Regenerate base maps: `python -m pipelines.fetch_basemaps` (no credentials; requires certifi, numpy and pillow).
- **Tests:** 52 web and 3 new Python tests (`tests/test_basemaps.py`) green, `npm run build` and `git diff --check` clean. Walkthrough in headless Chromium at 1440×900 and 390×844: globe → "Zoom in" → 2D with Sentinel-2 → candidate switch → "Global view" → "View the sector on the 2D map" → scrolling outward returns to the globe. No overflow on mobile. In the console, only the favicon 404 and intermittent 500 errors from online GIBS HLS tiles.
- **New decision:** ADR-006 (proposed).
- **Blockers:** 1) `CLAUDE.md` in `dev` says "SVG map, not MapLibre or WebGL"; resolved: the team accepted ADR-006 and ADR-007 and the branch was merged into `dev`. 2) `scripts/package_release.py` rejects the build: it still needs to admit the deferred chunks, the textures, the MapLibre worker and `basemaps/`.
- **Next steps:** 1) ~~review ADR-006/007~~ accepted; 2) extend the packager list; 3) test on the actual presentation machine with and without a connection.

## Available result

The app consumes `artifacts/science-v3/` (see the previous section). The following table is the v2 snapshot, which is kept as a historical record.

| Rank | Sector | Similarity | Confidence | Stability | Feasibility |
|---:|---|---:|---:|---:|---|
| 1 | Pampa Yungay | 75,67 | 77,45 | 99,03 | requires review |
| 2 | Cordón de Domeyko | 71,60 | 77,41 | 98,89 | requires review |
| 3 | Pampa María Elena | 49,99 | 77,44 | 98,41 | requires review |

Mandatory interpretation: this is a desktop screening to prioritize research. It does not approve sites or authorize access.

## Functional baseline inherited from v2

The counts and names of the three sectors in this section describe the v2 history; the active v3 result and its deliverable are above. The behavior of the ranking, map, record, comparator and export was extended to the seven sites and both countries.

- Pipeline authenticated with Earthdata Login and Copernicus OAuth; no secret is persisted in artifacts.
- NASADEM_HGT.001 multi-tile mosaic; Yungay correctly uses four tiles before being aggregated to ~473 m.
- Sentinel-2 L2A: 12 monthly intervals of 2025, ~30 m nominal, SCL, NDVI and BSI.
- HLS S30 v2.0: inventory: 338 granules in Yungay, 168 in Domeyko and 171 in María Elena.
- Topographic comparison with matched scale: aggregated NASADEM ~473–476 m versus MOLA ~451 m nominal.
- Weighted geometric mean, separate confidence, minimum 0,70 of valid weight and ±20 % sensitivity.
- Traceable constraints with authority, source, action and reason; those not evaluated force review.
- Manifest with URLs, versions, period, resolution, CRS, units, license, NoData, transformations and SHA-256.
- Static app: ranking, offline SVG map, record, breakdown, sources, warnings, comparator, JSON export and methodology.
- Permanent water screening with NASADEM SWB; María Elena retains a warning for ~0,15 %.
- Fixture snapshot remains in `artifacts/demo/` only to test boundary states and contracts.
- Delivery package v2 in `submission/`, two verified captures in `submission/assets/` and updated SHA-256 checksum.
- Post-Claude cleanup closed: no orphaned components or stylesheets from the discarded implementation remain.

## Recent changes

- Accepted by Codex (13:54): offline Sentinel-2 visual context per candidate, three real December 2025 PNGs, and full provenance. Verified images, selection, invalid data, missing file, and ZIP in subfolder. It does not change the science, score, or feasibility. Details in `docs/VISUAL_REVIEW.md` and ADR-005 (`accepted`).

- Profile v2 in `2.0.1-preliminary`: new limitations on per-source assigned quality, the meaning of `validated`, and the ratio of medians. Scores do not change.
- Web: single ordering with `rankCandidates`, area with two significant figures, and decimals with a comma.
- `submission/analogos-chile-static.zip` and `SHA256SUMS.txt` regenerated; the `submission/assets/` screenshots now reflect the new labels.
- `origin/main` points to `https://github.com/Esteban12-hori/AnalogOS`; the obsolete local remote was removed.
- Reproducible verification also passes without `data/raw/`: 30 tests green and one NASADEM integration test explicitly skipped.
- Accepted by Codex (12:44): `npm run release:package` generates the ZIP with an explicit file list, deterministic bytes, and SHA-256; the build loads in `/` or in `/AnalogOS/`. ADR-004 accepted. A restore failure detected during review was fixed; independent tests green.
- Claude's final visual adjustment accepted: the SVG map is aligned to the top in 16:9; the main screenshot, ZIP, and checksum were regenerated.
- The remote changes `6516743` and `3c1a014` were integrated by fast-forward: Vercel configuration and ignoring of `.vercel`. Kept alongside the reviewed delivery.

## Real snapshot sources

- NASA PDS MOLA MEGDR `MEGT44N000HB`, regional surroundings of Jezero.
- NASADEM HGT/SWB 1 arc-second: six Earthdata archives; mosaic per AOI.
- Copernicus Sentinel-2 L2A Statistical API, January–December 2025.
- NASA HLS S30 v2.0, CMR inventory 2025 without mixing pixels into the score.
- NASA POWER Climatology Point API 2001–2025.
- Natural Earth 1:50m only as a visual outline.

## Open limitations

- There is no exhaustive nationwide sweep: v3 evaluates 50 windows in two test regions; v2 evaluated three 0,2° seed sectors.
- Geology remains outside the score for lack of expert review.
- Official layers for urban areas, sensitive areas, property, or access were not intersected; water is screened, however.
- The ~460–480 m resolution does not assess obstacles or traction at wheel scale.
- Worldview/recent imagery inspection and expert review are still missing, if time permits. The December 2025 Sentinel-2 context is a partial advance: it shows rectilinear traces and geometric structures in Yungay and María Elena that are hypotheses to be checked against official layers, not verified facts.
- Stability measures the change in score from one weight at a time; it is not total scientific uncertainty.

## Historical verification of v2

The current M7 review is in `docs/CODEX_M7_REVIEW.md`. The following results correspond to earlier milestones and their historical ZIPs.

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | 119 tests green (31 for science and contracts, 39 for the packager, 49 for visual context); in a clone without `data/raw/` the 1 NASADEM integration test is skipped |
| `python -m pipelines.fetch_visual_context` | reuses the local visual package without network or credentials |
| `npm run release:package` | build + validation + deterministic ZIP; `shasum -a 256 -c SHA256SUMS.txt` OK; same SHA-256 in three runs |
| Local HTTP at `/AnalogOS/` and `/` | Claude checked HTTP responses; Codex verified the extracted ZIP in a browser, ranking, map, selection, water warning, and console with no errors |
| `npm run test` | 24 tests green (10 for visual context) |

| `.venv/bin/python -m pytest -q` | 31 tests green; in a clone without `data/raw/`, 30 green and 1 skipped |
| `npm run test` | 24 tests green (includes `surfaceSeries` and `globe`) |
| `npm run build` | contracts + TypeScript + Vite green |
| manual review | v2 snapshot, ranking, map, evidence, layout, and console with no verified errors |
| `npm audit` | 0 vulnerabilities |

The static build is at `apps/web/dist/` (~4,1 MB), includes `science-v2/` and `visual-context/`, with no mandatory external calls.

Codex repeated the suite and the packaging during the acceptance of M4-VISUAL-EVIDENCE. It verified the 12 ZIP entries against dist, its determinism, and the six snapshot/profile hashes against the baseline; no scientific changes. The ZIP weighs 4.084.880 bytes and its SHA-256 is `97dc819efb7e0511e2b4a6e388eab5cf113db442006b3b01b415ae0db9f25f81`. It also tested in a browser a missing PNG and an index with invalid scenes: both preserve the ranking and the detail card.

The static build is at `apps/web/dist/` (~3,2 MiB; ZIP ~2,2 MiB, almost entirely globe textures and three.js in a deferred chunk), includes only `science-v2/` and makes no external calls.

## Reproduction commands

```bash
# Demo con artefactos incluidos
npm install
npm run dev

# Entorno y ciencia histórica v2 (también aporta la referencia Yungay)
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot

# Piloto activo v3; descargas acotadas y reutilización de caché
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3

# Auditoría completa
npm run verify
```

## Large/non-versionable files

M7 adds seven NASADEM tiles (~102 MB), statistics and inventory of six windows, and the acquisition record in `data/raw/`; see exact paths in `docs/DISCOVERY_REPORT.md`. The following list describes the reused historical inputs.

- `data/raw/mola/megt44n000hb.img`: ~124 MiB.
- `data/raw/nasadem/*.zip`: six files, ~61 MiB combined.
- `data/raw/earthdata/cmr_inventory_v2.json`: HLS/NASADEM inventory, regenerable.
- `data/raw/copernicus/sentinel2_stats_2025.json`: monthly statistics, regenerable.
- `data/raw/srtm/`: kept only to reproduce v1.

## Recorded decisions

- `docs/decisions/ADR-001-offline-svg-map.md`
- `docs/decisions/ADR-002-science-screening-v1.md`
- `docs/decisions/ADR-003-authenticated-precision-snapshot-v2.md`
- `docs/decisions/ADR-004-portable-static-release.md`
- `docs/decisions/ADR-005-offline-visual-context.md`
- `docs/decisions/ADR-006-global-discovery-pilot.md`

## Human actions before submitting

1. Record the video using `submission/VIDEO_SHOT_LIST.md`.
2. Publish, when authorized, `apps/web/dist/` or `submission/analogos-static.zip` (v3).
3. Test the demo/repository/video in incognito mode and fill in their URLs.
4. Add team members and contributions.
5. Save the submission receipt.

## Git Notice

The folder has had its own Git repository since 2026-11-14 (branches `main` and `dev`; work continues on `dev`, created from `main` at `92053ea`), with a single remote `origin` at https://github.com/Esteban12-hori/AnalogOS (private: for submission it must be made public or access must be given to the judges). `.env`, `data/raw/`, `node_modules/`, `dist/`, `.venv/`, `*.egg-info/` and `.claude/` are excluded because of `.gitignore`. In a fresh clone, the test that reprocesses raw NASADEM is skipped until `python -m pipelines.fetch_precision_data` is run; the rest pass without `data/raw/` (verified in a clean clone).
