# Working changelog

## 2026-11-15 Claude Code — EN | ES selector: review fixes

- 2D map: the focusable MapLibre canvas is named in the interface language (“Map” / “Mapa”) and renamed on a language change; it used to stay “Map” in Spanish.
- Planner step announcement and mobile metrics carousel live region are emptied on a language change (`useLiveText`) instead of keeping the previous language.
- No Spanish-only truncation at 360–1440 px: places title keeps its width (tools shrink first, country chips on one row), shorter Spanish dock prompt «Describe tu prueba para Marte…», ◆ card « · fuera de la búsqueda» and «sin %, sin puesto».
- Snapshot error screen: loader messages are canonical English and shown in Spanish; other technical details are marked `lang="en"`.
- `npm run verify` green (330 Python; 1027 web, 3 opt-in skipped). Browser on the final build: 137 targeted checks and the 123-check EN/ES walk, 0 failures, exports byte-identical EN = ES. Package `/tmp/claude-rel/es-fix.zip` (81 entries, SHA-256 `156dddd6…bf6a7a7`). No contract, record, export, server or AI change.

## 2026-11-15 Claude Code — EN | ES selector: three areas integrated (ADR-017, proposed)

- Merged `es/ui-core`, `es/mission-ui` and `es/ai-science` into `feature/es-selector` (no conflicts). Spanish now covers Explore, place sheet and tabs, rail, metrics, leader lines, globe/2D map, composer, “Your mission”, planner, result, print report, Reading, geology card/guidance and AI messages; English output unchanged.
- AI draft accepts an optional `language: 'en' | 'es'` (absent = `en`, prompts byte-identical; invalid = 400); the client sends it only from the Spanish interface. `source_quote` stays literal; explain/geology unchanged.
- One-line integration fix: Reading passes `locale` explicitly to `buildMetricViews`. `docs/I18N.md` and ADR-017 updated (new helpers and catalogs, canonical mission messages, template text becomes user text, AI message known limit, cost 559.3 KB / gzip 159.2 KB).
- `npm run verify` green (330 Python; 1020 web, 3 opt-in skipped). Browser walk at 1440×900 and 390×844 in EN and ES (selector and `?lang=es`), 123 checks, no errors; mission, geology-wrapper, per-site geology and site-record exports byte-identical in EN and ES. Package `/tmp/claude-rel/es.zip` (81 entries, SHA-256 `775687fd…4723b`); `submission/` untouched.



## 2026-11-15 Claude Code — EN | ES selector base (ADR-017, proposed)

- English stays the default and the only record language; Spanish is a presentation layer. New `apps/web/src/i18n/` base: language store (`?lang=` > localStorage > en, `<html lang>`), typed catalogs with compile-time parity, en-US/es-CL UI formatters, accessible EN | ES selector in the top bar, `<head>` language script and Spanish static shell before React.
- Record text shown in Spanish through the frozen 1.0.0 / geology v1 packs (`displayRecordText`), proven with the engine as oracle; exports and fingerprints identical in EN and ES. Artifact text shown in its original Spanish in ES (English renderings and glosses unchanged in EN).
- Translated: top bar, mode tabs, sheet head, App states, boot log/chip/announcement, data credit, meta description. The wordmark now hides at ≤540 px (emblem always visible) so the selector fits at 360 px.
- `npm run verify` green (330 Python; 941 web, 3 opt-in skipped); browser walk at 360–1440 px in both languages. Remaining areas (ui-core, mission-ui, ai-science) per `docs/I18N.md` §7.


## 2026-11-15 Claude Code — official AnalogOS logo

- Top bar uses the official logo: the emblem (planet, ring and star) and the wordmark recolored for the dark UI ("Analog" light metallic, "OS" orange). Applied through CSS (`.brand-mark`, `.brand-text strong`), so the React top bar and the static pre-load shell match. Below 420 px only the emblem shows.
- Favicon: 32 px emblem as an inline PNG data URI (no extra request, release packager unchanged).
- README (EN/ES) shows the logo, light or dark per GitHub theme. Sources in `docs/brand/` (original untouched).
- Verified: `npm run verify` (330 Python, 899 web, typecheck:server, build), release package includes both logo assets; browser at 1440, 390 and 360 px and with JS blocked (static shell), no overflow or page errors.

## 2026-11-15 Codex — English release completed in production

- Final code fab8ed9 promoted through dev/main without force. Final Actions 43723813882 (dev) and 43724021553 (production) succeeded; packaged function startup passed.
- Verified English mobile Refine/counter in production and replaced the README screenshot with the actual English app. Added the 390×844 production image as evidence. Both real AI operations and geological references had already passed with identical server code; dev export reconstructs exactly.
- Current ZIP: 74 entries, 14,891,807 bytes, SHA-256 86a157e08416a3d1b0ea3e1129c9a45f73e850e464b943936d9cb2e2077e6d19, repeat-identical and CRC/checksum correct. Original source data and historical records/archives preserved.
- Explicit QA limits retained in CODEX_ENGLISH_REVIEW: no fresh all-page English PDF audit, physical iOS or deliberate GIBS network-failure test. This final [skip ci] checkpoint changes only documentation/evidence/images. Task completed; Claude has no new assignment. Unrelated outputs/ remains excluded.


## 2026-11-15 Codex — final English mobile copy and deployed AI checks

- Deployed English code 18b14eb passed dev/production Actions. Both real Anthropic operations worked in dev and production, with three AR6 geological references. The complete dev export reconstructs identically.
- Mobile QA found the Refine/pending labels and a metric counter still in Spanish. Corrected the real components and strengthened their rendered-state tests; 41 related tests and build passed. Five test-description fragments corrected. No API/science/contract change.
- Portable archive regenerated and repeated identically; final publication and production screenshot follow. Evidence in CODEX_ENGLISH_REVIEW and submission/evidence/english/.


## 2026-11-15 Codex — English default accepted for publication

- Reviewed Claude's compatibility, UI/AI and code-prose phases; translated public, internal and historical documentation. Complete English README and retained README.es.md; English pitch/demo counterparts.
- New English mission 1.1.0 and geological v2 records preserve strict historical v1/1.0.0 reconstruction. Original science/source evidence, identifiers and user text remain unchanged. Display-only English glosses keep official geological originals available.
- Independent verify: 335 Python / 898 web, three opt-in skipped, types/build/generated validators and diff-check passed. Real Anthropic English and Spanish drafts, AR6 explanation/geology and downloaded export reconstruction passed locally; mobile/desktop Reading and full Metrics reviewed.
- Native English preview opened; no new all-page PDF audit is claimed. See CODEX_ENGLISH_REVIEW for exact evidence and limits. Dev/main publication and production screenshot follow acceptance; unrelated outputs/ excluded.


## 2026-11-15 Codex · English-default scope and Phase A acceptance

- Dan expanded the English README request to the whole repository, including the application, reports and internal/historical documentation; `README.es.md` remains available.
- Codex translated documentation and added English pitch/demo variants. Corrected current presentation text that still described official geology as a future feature; it now describes the separate evidence layer and unchanged similarity score. Original evidence and explicitly Spanish alternatives are preserved.
- Claude implemented explicit English record versions with frozen legacy wording. Codex independently verified 335 Python / 868 web tests, 3 opt-in skipped, types/build passed; all ten historical exports reconstruct and all 77 protected files retain their hashes.
- Phase B assigned to Claude: complete English UI, AI, dynamic source presentation and PDF. Not yet released. Full review: `docs/CODEX_ENGLISH_REVIEW.md`.

## 2026-11-15 Claude Code — similarity color scale

- The similarity percentages use a scale: 0–49 red · 50–69 yellow · 70–89 blue · 90–100 green (`domain/similarityScale.ts`, `--sim-*` tokens). It applies to the carousel rings and each criterion's rings, to the percentage on the rail and the sheet, to the Tesla-style lines, and to the pin label. Confidence and feasibility do not change.
- The tone is computed on the number as displayed (a 69,6 that appears as "70" is blue). The number is always visible and the scenario legend clarifies "it is not suitability".
- Verified: `npm run verify` (328 Python, 805 web, typecheck:server, build); browser review at 1440 and 390.

## 2026-11-15 Claude Code — mobile sheet: empty list when swiping

- On mobile, when swiping up the places sheet (or using "View list"), the list was 0 px tall (`flex: 1 1 0` with no height on the parent) and was clipped: empty screen. In the sheet, the list now takes the height of its content and the sheet itself does the scrolling. The desktop dock keeps its internal scroll (`features/places/places.css`, regression test in `places.test.ts`).
- Verified: `npm run verify` (328 Python, 801 web, typecheck:server, build); in the browser, the gesture and "View list" at 390×844 and 360×780 show the full list, and the dock at 1440 remains the same.

## 2026-11-15 Codex · M11 published and verified in production [skip ci]

- Code e5e9139 on dev and main, without force; both deployments correct (43686593750 / 43686863876). Navigation and report verified on dev before promoting main.
- In production: AR6 preserved from the dock, Claude draft of four requirements, explicit confirmation, single evaluation, and explanation/geology with three SEGEMAR references. Downloaded JSON validated and rebuilt identically; mobile screenshot added.
- Continuity updated, with no changes to the runtime or ZIP in this checkpoint. Development on dev, Claude with no new task. Details and QA limits in docs/CODEX_M11_REVIEW.md.

## 2026-11-15 Codex · M11 acceptance and independent QA

- Reviewed three Claude deliveries: visible mobile CTA of 44 px, navigation without altering the mission, and complete PDF with geology. Codex grouped provenance and footprints to avoid splitting across pages.
- QA on Chrome mobile/intermediate/desktop, MDRS reference, no selection, no prioritized areas, outside coverage, Back/Escape and invalidation. Native PDF of 18 pages rendered and reviewed; previously it was cut off to one page.
- 333 Python/799 web, 3 opt-in skipped, types/build correct; 35 related tests after final adjustment. ZIP regenerated and verified. Evidence in docs/CODEX_M11_REVIEW.md. Publication to dev/main authorized by Dan, in progress.

## 2026-11-15 Claude · M11 round 3 in review

- Criteria table of the printed report: `CriteriaTable` (`components/planner/ResultView.tsx`) receives the class `pl-criteria-table`. In `shell/shell.css` (`@media print`) it uses `table-layout: fixed` with columns at 18/15/13/20/18/16 %. The cells use `overflow-wrap: break-word`, so a word is split only if it does not fit; links and codes use `anywhere`. The repeated header, complete rows and printed URLs are preserved. No changes to text, font size, screen, or the confirmed requirements tables (5 columns) and Measures (3).
- `npm run test`: 799 pass and 3 skipped; `npm run build` correct. No new PDF was generated; Codex verifies it. Codex's provisional PDF remains intact.

## 2026-11-15 Claude · M11 round 2 in review

- Codex finding at 390×844:: the button was at y=1470 and measured 34 px. "Go to Reading" becomes a single action, placed after `pl-lead` and before chips, groups and export (`components/planner/ResultView.tsx`). It has `min-height: 44px` and its own margin (`features/composer/mission.css`). Text and behavior unchanged.
- Regression in `tests/readingPrint.test.tsx`: single presence and order, with and without prioritized areas, and the action outside the export. `npm run test`: 799 pass and 3 skipped; `npm run build` correct. Python was not repeated (presentation-only change). Actual visibility is verified by Codex.

## 2026-11-15 Claude · M11-READING-PRINT in review

- "Go to Reading" from the compact result of "Your mission", also without prioritized areas. The `uiActions.requestReading()` action pins Mission and the surface is chosen by breakpoint (`shell/readingRoute.ts`): left panel, pill in Mission 1100–1439, S2 Reading tab, or the new `sheet.reading` view (without ● or with ◆). Selection, the planner and the AI remain intact.
- Printing:
  - reset of the fixed scenario in `@media print`, pagination, table headers and URLs;
  - complete `PrintGeology`, with pieces shared with the screen;
  - notice when there is no current report;
  - "Print report" button disabled until the current report is mounted (`printState.ts`), with no deferred printing.
- Files:
  - `state/ui.ts`;
  - `shell/{AppShell.tsx, readingRoute.ts, detail/FullDetail.tsx, shell.css}`;
  - `features/analysis/{ReadingPill,ReadingView,index}`;
  - `features/composer/{MissionPanel,PrintContent,printHost,printState}`;
  - `components/planner/{ResultView,PlannerView,GeologyGuidance}`;
  - tests `readingPrint.test.tsx` (new) and `plannerGeology.test.tsx`;
  - docs `BUILD_CONTRACTS.md`, `UX_REDESIGN.md` and analysis/composer READMEs.
- `PATH="$PWD/.venv/bin:$PATH" npm run verify`: 333 Python, 798 web and 3 skipped; build correct. A native PDF was not checked; this is left for Codex.

## 2026-11-15 Codex · M11 assignment to Claude

- Dan asks to resolve access to Reading on mobile and review report printing. Assignment and criteria in NEXT_TASK; plan checkpoint before implementation and independent review before publishing to dev only.

## 2026-11-15 Codex · production verified and screenshot published [skip ci]

- Main advanced without force to `7e8c779`, same as dev. Production Actions `43682694089` and dev `43682693561` correct. The public website loads the redesign and snapshot v3.
- After publishing, real production capture `analogos-production.jpg` added to the README. No changes to the deployed code, data or ZIP in this checkpoint.
- Real Anthropic in production: draft of four requirements, AR6 scope preserved, confirmation, evaluation, and explanation/geology with three valid references. Downloaded JSON validated and rebuilt identically; capture and provenance added. Details in `docs/PRODUCTION_RELEASE.md`.

## 2026-11-15 Codex · README Explore/Mission and promotion to production

- Dan authorizes moving the complete delivery from dev to main and, after publishing, replacing the screenshot with a capture of the new production.
- README presents both modes, the walkthrough from a sector, Reading and geological guidance, mobile use, and analogs to be computed; link to the public application. It keeps the scope of the pilot and Yungay REF.
- Workflow delivers Anthropic to main as well, exclusively at runtime from the existing secret; it halts publication if it is missing. Deployment and AI documentation updated.
- Prior verification: 333 Python, 784 web, 3 web opt-in skipped, types/build correct; deploy step with simulated CLI on dev/main with/without key correct. Publication and final screenshot will be recorded after verifying production.

## 2026-11-15 Codex · remote closure of the integration [skip ci]

- `9c183fb` published; Actions `43681551867` correct, including packaged function and dev alias. Retested from a new tab: Submit preserves AR6; real Anthropic draft and explanation/geology, six confirmable requirements and a single evaluated sector.
- Final export validated and rebuilt identically, three valid geological references; capture and provenance added. STATUS/NEXT_TASK/RESUME_CODEX updated, with no new assignment to Claude. This checkpoint only documents the code already deployed; ZIP and data unchanged.

## 2026-11-15 Codex · acceptance of the integrated redesign and preservation of the sector

- Review of `dev` `dd625b4` and real test from the interface: Anthropic draft, confirmation, AR6 evaluation, explanation and SEGEMAR geological guidance. Export downloaded, validated and rebuilt identically; evidence and capture added.
- Fixed a dock regression: sending the brief while preserving the walkthrough and geometry avoids widening AR6 to the seven windows. Test reproduced red/green and walkthrough verified in the local build; engine and server unchanged.
- ADR-013/014 accepted. Yungay remains REF outside the discovery ranking and available as a known alternative in Mission (ADR-009 §5). Reference 006/007/014 corrected in CLAUDE.md; historical plans and current checkpoint clarified.
- `npm run verify`: 333 Python, 784 web, 3 web opt-in skipped; types and build correct. ZIP regenerated and verified: 73 entries, 14.792.109 bytes, SHA-256 `d977f0adf4f9e7e3d2ee4e9b780ee7f00d7124def36b24e1369a7270e8e12393`.
- Pending items documented, without attributing them to completed validation: direct navigation to mobile Reading, GIBS without network, native printing and real iOS. Details in `docs/CODEX_INTEGRATION_REVIEW.md`.

## 2026-11-15 Codex · Product-oriented README

- Presentation centered on AnalogOS users, problem, journey and evidence. Event dates, detailed score tables and internal coordination are removed from the README; the real scope of the pilot and the optional role of AI remain explicit.
- A new `docs/DEVELOPMENT.md` brings together installation, verification, packaging, source reproduction and continuity. Local references outside the repository and the old claim of national coverage are removed.
- Documentation-only change requested by Dan; science, application and M10 deployment preserved. Verification recorded in `project/tasks/README_PRODUCT.md`.

## 2026-11-15 Claude Code · review of the M9/M10 merge: findings fixed (branch feature/mision-redesign)

- **Compact "Your mission" (medium):** the team's geological guidance is folded after export (`<details>` closed; summary with the label "AI selection" / "General guidance without AI" and "N sectors"), with no outer frame. `GeologyGuidance` and the team view do not change. "Download JSON" goes back to 1.408 px at 1440 (it was at 6.670), 1.235 at 1280 and 1.384 at 390.
- **Sheet:** the tab strip fades the edge that hides tabs and brings the active one into view without moving the sheet (`Tabs.tsx`, `overflowEdges`/`revealDelta` with tests). The "Geology" header in 390 is no longer split into two columns.
- **Docs:** invariants corrected in STATUS and `INTEGRATION_PLAN` §11 (`apps/web/package.json` and the base map files have differed since before the merge); `DEMO_ACCEPTANCE` describes the fold.
- Not fixed: `CLAUDE.md:34` (ADR-010 → 014, is left for a person), "Go to the Reading" on mobile and offline GIBS tiles (low, non-trivial).
- `npm run verify`: 328 Python (5 skipped), 783 web (3 skipped), `typecheck:server` and build. Chrome on port 4731 (1440, 1280, 390): correct build, ZIP under `/AnalogOS/` 96/96 and with no network 32/32, 0 app errors. ZIP: 73 entries, 14.792.111 bytes, SHA-256 `cd09543ce3d882f07aeddd5d357b763203b105eb631c860e8cee9d591327fda2`. `origin/dev` advanced to `e074762` (docs only): it must be merged before the push. No push.

## 2026-11-15 Claude Code · merge of M9/M10 into the integrated interface (branch feature/mision-redesign)

- `git merge origin/dev` (`d2252b6`, 7 M9/M10 commits), without squash or `--force`. Everything belonging to the team remains intact: `shared/`, `server/`, `api/`, `vercel.json`, workflows, `check-vercel-function`, contracts, geological artifacts, pipelines, evidence and tests. Conflicts resolved in `App.tsx`, `PlannerPanel`, `ResultView`, `styles.css`, `discovery.test`, `package_release.py`, `test_release_package.py` (both branches are kept), docs and ZIP. `CandidateDetails` and `ScoreBreakdown` remain retired and their changes were ported.
- Interface: "Geology" tab in the sheet with the team's `GeologyContext` and its per-sector export. Geological texts in Metrics and Sources. Geological guidance (`GeologyGuidance`) is in "Your mission" and in the printable report. The geology checkbox, the conditional notice and "Retry without geology" are in the Reading. The mission controller carries the geological channel from `usePlanner`: `setGeology`, closed catalog, opt-in fingerprint and M10 export. The context is loaded in a deferred chunk.
- Own ADRs renumbered: fixed scenario 010→**014** and recalculation 011→**015**. ADR-010 and ADR-011 belong to the team.
- `npm run verify`: 328 Python (5 skipped), 779 web (3 skipped), `typecheck:server` and build correct. Chrome at 1440×900 and 390×844, on the build and on the ZIP under `/AnalogOS/`: 56 + 56 correct checks and 24 more with no external network, with 0 app errors. The AI was tested without a key and simulated with the server's real handler.
- ZIP regenerated: 73 entries, 14.789.257 bytes, SHA-256 `30b2b1191489898b91e85aaf26f93104da62bc733d854ae0352e517bf2517c9c`. It is deterministic and matches dist. No push.

## 2026-11-15 Claude Code · integration review: findings fixed (branch feature/mision-redesign)

Three independent reviews of `e568d9d` (scientific honesty and AI, visual journey at 1440/1280/390, no regression of the team's work). The 2 high findings, the 11 medium ones and 9 of the 12 low ones were fixed; each with a test or a measurement in the browser. 3 low ones remain unfixed (see STATUS). No changes to `shared/`, `server/`, `api/`, `apps/web/src/mission/`, scientific artifacts, CI or dependencies.

- **Reading (AI):** the note "All requirements are met…" now comes from the evaluation, not from what the AI chose; if the selection omits places with blockers, it says "The AI did not highlight reasons for N places" and lists them. The highlighted reasons follow the evaluation order even if the AI returns another (the AI does not rank). Provenance (model, date, request_id) travels with the view and remains visible with the Reading dimmed; a single ✦ in the label.
- **REF in Mission:** the team's engine may give Yungay a rank; the UI always shows it with "REF" (rail, sheet S1, carousel, globe) and the REF does not count in "N of M prioritized candidates" or in the carousel title ("+ REF"). Ranking only candidates in `shared/mission/evaluate.ts` remains a team decision.
- **✦ AI only:** outside the Explore pill, the Mission form (and its pulse after evaluating), "Refine", the Reading skeleton and the "Your mission" loading.
- **"Your mission" (≥1440):** with no current result, the planner takes up the panel and the Reading is left in a strip of ~22 %; in compact variant, "Load an example" and the text go at the top, the journey cards lose the description and "Next →" stays fixed at the bottom. Measured at 1440×900: example, text and "Next" in view without internal scroll.
- **"Send":** takes focus to the text loaded in "Your mission" even if the step was already open, and the composer says "Text loaded in "Your mission"…".
- **AI wait:** the phase text no longer sits in the corner over the logo (the orbit continues around the globe; the phase is stated by the composer).
- **Globe and 2D labels:** name and status are shortened with "…" (the rank and the % are not); the 2D map writes `--pin-x` like the globe, so the label does not go off screen at 390 px. The "Metrics in the panel →" chip goes under the ring and does not cover the label.
- **Carousel:** the title ("Your mission · 4 prioritized") is no longer the first thing lost; on narrow cards, short readable forms ("#2 · Prioritized", "Conf.", "Feasib.: review") with the full one in the accessibility tree; "similarity v3" whole and the figure inside the ring. "status · rules mission-rules-1.0.0" instead of "team rules". With an unsupported objective, the ring says "not applicable" and does not show the rover profile similarity.
- **Sheet:** "Download sheet (JSON)" in Sources uses the team's `buildExport` (honesty notice and `search_context`), same as "Export sheet (JSON)".
- **Privacy:** the `title` of "Delete all" in "Your mission" no longer promises that nothing is stored (there is a local history) and says how to delete it; the team's standalone panel keeps its text. "Requirements proposed with AI · confirmed by you" after confirming.
- **Miscellaneous:** texture preloading with `crossorigin` (each texture is downloaded once and without warnings); suggestions hidden while the "Your mission" popover is open.
- **Delivery:** `submission/analogos-static.zip` regenerated with the integrated interface (66 entries, 14.508.759 bytes, SHA-256 `c5904c66…`); demo script and "M8 Journeys" updated.
- **Verification:** `npm run verify` → pytest 190 + 4 skipped, `typecheck:server`, vitest 624 + 2 skipped, build. Entry chunk 122,9 KB gz (+0,7). Journey in Chrome (port 4631) 1440×900, 1280×800 and 390×844 with no page errors.

## 2026-11-14 Claude Code · integration of the redesign with dev (branch feature/mision-redesign)

Direct request from the user: "merge into dev and push". Decision: the UI is the redesign's and internally the team's planner, Anthropic AI and v3 data are used (ADR-013, `docs/INTEGRATION_PLAN.md`). The push to `dev` remains a separate step.

- **Merge** without squash of `origin/dev` (`92392f1`): `shared/`, `server/`, `api/`, v1/v2/v3 artifacts, M8 contracts, `vercel.json` and CI come in unchanged. Precompiled validators with search and background in a separate chunk; `loadingHints` preloads v3; packager with the dev base plus base maps, preload and favicon.
- **Explore v3:** global rank with `splitByRole`, REF labeled and outside the ranking in carousel, globe, rail, Compare and Reading; country filter that keeps the rank; CL+AR outline; Origin tab, "Export sheet (JSON)", "Evaluate this sector" and "How they were searched" in Method; brand "AnalogOS · Chile–Argentina Pilot".
- **Mission:** a single shared team planner (deferred controller); "Your mission" with `PlannerView` and compact `ResultView`; "Send" does not call the AI; evaluation states in carousel and globe, requirements layer in rail and lines, no mission %; JSON export, printing and out-of-coverage diagnosis.
- **Reading** in three layers (result, highlighted reasons with template or Anthropic, snapshot facts); the AI only with an explicit button.
- **Retired:** own engine (`features/engine`), lktron channel, pregenerated prose and contracts `mission-interpretation`, `evidence-packet` and `ai-analysis`.
- **ADR:** 008→010 (fixed scenario), 009→011 and 010→012 (replaced by the team's ADR-009), new ADR-013.
- **Verification:** `npm run verify` → pytest 190 + 4 skipped, `typecheck:server`, vitest 603 + 2 skipped, build. Team tests intact. Entry chunk 122,2 KB gz (+10,3). Smoke `/api/ai`: 405 and 503 `no-store`. ZIP in `/tmp/claude-rel/integ.zip`, reproducible; `submission/` untouched.

### Redesign history before integration (branch feature/mision-redesign)

Original entries. They use the ADR numbering prior to the integration: ADR-008 → ADR-010 (fixed scenario), ADR-009 → ADR-011 and ADR-010 → ADR-012 (both replaced by the team's ADR-009).

#### 2026-11-14 Claude Code · Explore / Mission redesign: review corrections (branch feature/mision-redesign)

- **Figures from a single source:**
  - Compare uses the active profile, with the engine's order and figures in Mission and a profile label.
  - `scoreMission` delivers `stability`, the same as the Reading.
  - Geology without data is shown as "to be calculated · outside your profile".
  - An excluded criterion does not "saturate".
  - Note when confidence rises only because a criterion without data was left out.
- **AI filter:**
  - Rejects ranking vocabulary (`rank`) and the quantifiers "medium/half", "pair" and "quarter".
  - A `summary` or `tradeoff` that compares must cite the rank or a `best_of_n` (`rank_fact`).
- **Labels:**
  - ✦ in the phrase under LIMITING FACTOR.
  - sr-only prefix "AI text:" or "Pregenerated text, not scientific:".
  - ✦ only with lktron.
  - "DEMO · no AI" first in the status line.
  - "Suggested test" according to the source.
  - "Thermal range" everywhere.
- **Data attribution always visible**, generated from `manifest.datasets` (`shell/attribution.ts`), in the scenario strip and in the static HTML.
- **Signal:** final figure without odometer; NDVI in blue with ↑/↓.
- **Accessibility:**
  - Focus management in sheet and rail.
  - Esc in a popover no longer clears the selection.
  - Top bar first in the DOM, `<main>`, `h1` and accessible notice under 860 px.
  - Pins that are hidden or almost on the horizon, outside the focus order.
  - Two-tone focus over images.
  - Topbar without blur and glass .86.
  - Thumb #0274AD.
  - `prefers-reduced-transparency`.
  - Bounded loops.
  - Touch targets of 44 px.
  - Minimum text of 10 px.
  - Announcements without duplicates.
  - Bounded «/».
- **Layout:**
  - Compact cards via container query.
  - Left panel in two scroll regions, with the presets collapsed below the results.
  - Full-height side sheet.
  - Touch hover without getting stuck.
  - The chip and the carousel count the drawn ◆.
  - Error without field criteria that lists what was not measured.
- **Performance:**
  - Initial JS 119,1 → 111,9 KB gz (+11,9 over 857b05f).
  - Validators split per chunk.
  - `engine` 15,6 → 8,5 KB gz.
  - `lktronClient` deferred.
  - Method and Sources deferred.
  - FLIP without synchronous layout on mount.
- **Verification:**
  - 856 tests; build green; pytest 170/1 skip.
  - Smoke 34/34 and findings 35/35 in the browser, with no console errors.
  - Interleaved Lighthouse (see `docs/PERFORMANCE.md`).
  - ZIP in `/tmp/claude-rel/final.zip`.

#### 2026-11-14 Claude Code · Explore / Mission redesign: integration of increments 3–10 (branch feature/mision-redesign)

- **Merges** with `--no-ff`, with no text conflicts, in this order:
  - `build/engine`: 1.0.0 engine with parity ≤1e-6 with `pipelines/scoring.py`, profiles, DEMO matcher and phases;
  - `build/places`: PlaceRail and `config/reference_analogs.json` with 7 ◆ and sources;
  - `build/globe`: ● ◆ ○ markers, flight, clustering and keyboard;
  - `build/metrics`: MetricRail, `buildMetricViews` and S1; removes `breakdown/`;
  - `build/leaders`: Tesla lines;
  - `build/boot`: «Honest orbit» with real milestones;
  - `build/composer`: composer, «Your mission», history and results choreography;
  - `build/analysis`: evidence, AI filter, robustness, Reading, pregenerated and lktron NDJSON.
- **Integration:**
  - «View list» in the sheet opens S1 with `sheet.list` (`onListViewChange`).
  - `data-obstacle` in `pill.reading`, `.stage-dock` and `.stage-controls`.
  - Obstacles are measured again after applying the settled margins.
  - If the lines go to the right, the label of the selected pin is hidden.
  - The DEMO receives the id and version of the loaded profile.
  - The «Refine» strip has a solid background.
  - The label of the selected pin ends at the edge of the free area (`--pin-x` per frame and `max-width`): it no longer ends up under the rail in Mission at 1440 nor gets cut off at the edge at 390.
- **Bundler:** a single initial chunk (`codeSplitting` with `$initial`): −5,7 KB gz of JS, −0,5 KB gz of CSS and ~18 `modulepreload` less on the critical path.
- **Packager:** supports `analysis/ai-analysis.default.json` (optional, fixed name), with one test.
- **Tests:**
  - The engine stub test becomes the unconditional honest rule.
  - The composer case that only ran with the stub is removed.
  - The analysis integration no longer skips itself.
- **Cleanup:** dead rules `.globe-label` and `.globe-callout` in `liquid/`.
- **Reproducibility:** the generator of the pregenerated analysis moves from `/tmp` to `scripts/make_pregenerated_analysis.py` and reproduces the committed JSON byte for byte.
- **Branches:** the 8 `build/*` branches were deleted because they had been merged; their worktrees were left on a detached HEAD.
- **Verification:**
  - 817 web tests (56 files), build green and pytest with 170 passed and 1 skipped.
  - Browser walkthrough at 1440×900 and 390×844 (Explore, selection, Mission DEMO → Reading, 2D and back): 34/34 checks and 0 console errors.
  - Lighthouse, median of 3 against `857b05f`: on mobile the score stays the same (75) and LCP goes from 5,0 to 5,3 s; on desktop, 98 = 98.
  - Delivery ZIP generated in `/tmp` with `analysis/ai-analysis.default.json`.
- **Pending:** the initial JS is +17,8 KB gz over `857b05f` (limit +12) and several deferred chunks exceed their line in §6.1. The detail is in `project/STATUS.md`.

#### 2026-11-14 Claude Code · Explore / Mission redesign: increments 0–2 and parallel contract (branch feature/mision-redesign)

- Increment 0:
  - ADR-008 (fixed stage and sheet), ADR-009 (deterministic client-side recalculation) and ADR-010 (optional AI), in proposed status.
  - Schemas `reference-analog`, `mission-interpretation`, `evidence-packet` and `ai-analysis` with 30 valid and invalid fixtures (`tests/fixtures/contracts/`), tested with precompiled Ajv (Vitest) and with jsonschema (pytest).
  - Second deferred validators module (`validators.mission.generated.js`), with `--check` in the build.
- Increment 1:
  - Motion, color and glyph tokens (`shell/tokens.css`, `shell/glyphs.ts`).
  - Store `ui` and store `mission` with `useSyncExternalStore`.
  - `useReducedMotion` with listener.
  - `formatScore` with fixed decimal 1 (49,99 → «50,0»).
- Increment 2: fixed 100dvh stage shell with no document scroll.
  - APG tabs Explore | Mission with `?modo=`.
  - Bottom dock, right rail with «View full profile» (520 px, tabs Metrics · AI Reading · Signal · Compare · Method · Sources) and left panel ≥1440.
  - S0/S1/S2 sheet <1100 with `resolveDetent` (threshold, hysteresis and cancellation), `useKeyboardInset`, `pushState`/Esc and `inert`.
  - `MapStage` receives `insets`/`baseInsets` (`setViewOffset` x/y and `setPadding`).
  - The pre-React poster is aligned with the new base margins.
  - The hero, the floating card, `LiquidNav` and `LazySection` are removed.
- Parallel contract:
  - 8 features with stable `index.ts` and honest stubs mounted in their slots (`data-slot`).
  - `docs/BUILD_CONTRACTS.md` with file ownership.
  - Guard `featureContracts.test.ts`.
- Verification:
  - 141 web tests, 165 Python (1 skipped) and build green.
  - Browser at 1440×900, 1280×800 and 390×844 with no console errors.
  - Main chunk +2,6 KB gz of JS and +1,0 KB gz of CSS.

## 2026-11-14 Codex · M10 published and verified on dev

- Code `4708b42b4bd152dca74d3e009f233a910e458d8b`, Actions 43665786554 successful, isolated real function validated. Remote AI AR6 correct: three SEGEMAR references, traction pending; downloaded report validated and rebuilt identically.
- 316 Python/332 web, typecheck/build successful; final mobility/sampling contrast with 12 references each and different purposes; historical regression and integrity correct. ZIP `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`.
- Evidence and capture in submission; closure in DEV_AI_VERIFICATION and CODEX_M10_REVIEW. Documentation checkpoint `[skip ci]`, same code deployed. Claude has no new task; main was not modified.

## 2026-11-14 Codex · reliability of the geological guidance

- Dev showed an excess of model references in AR6. Claude fixed it as commissioned and Codex reviewed a recovery with a single retry, preserving limits, validation and total timeout. 316 Python/332 web correct; three real AR6 queries valid. ZIP updated. Final publication in progress.

## 2026-11-14 Codex · filePathMap in the Vercel check

- The second attempt showed that resolving links was not enough: Vercel declares FileFsRef outside .func through filePathMap. The check rebuilds only those declared files before isolating and checking the function. Local repro before/after correct, negative cases preserved. Dev still keeps M9 until this check is completed.

## 2026-11-14 Codex · fix to the M10 packaging check

- The first real Vercel check stopped publication because of broken JSON links when copying the function to /tmp. Reproduced outside the repository; the copy now materializes the linked files and preserves isolation and the negative cases. It does not change the application, AI, data or ZIP. Dev retry after validating the same fixture before/after.

## 2026-11-14 Codex · M10 accepted locally

- Claude's implementation reviewed; three reproduced report-integrity failures closed. Clickable sources, percentages with/without overlap and a consistent submission notice. Codex fixed mobile URL overflow.
- 316 Python, 325 web, typecheck/build correct; real AI with contrasting objectives and from the browser. Downloaded report rebuilt identically; historical M8/M9 regression correct; offline/mobile/keyboard ZIP and load failures reviewed. 33 protected unique files intact, no credentials in deliverables.
- Dev authorized by Dan: remote publication and verification in progress. Main preserved; Claude has no new task.

## 2026-11-14 Codex · M10 assigned to Claude

- Dan authorizes incorporating geological evidence into the AI guidance and publishing dev after review. Assignment with plan checkpoint, verifiable sources/IDs, fallback and compatible export. Scientific evaluation and artifacts preserved.
- M10 baseline saved; initial verify correct (316 Python, 246 web, typecheck/build). Codex supervises and accepts; Claude implements without publishing.

## 2026-11-14 Codex · M9 published and verified on dev

- Code `34e76b9`, Actions 43658989969 successful; dev alias updated and packaged function verified. Main preserved.
- Remote geological context and Argentine export validated; Yungay reference preserved. Real Anthropic draft and explanation correct; downloaded JSON validated and recalculated identically.
- Evidence in `submission/evidence/m9-dev-*.json`, screenshots in `submission/assets/analogos-m9-dev*.jpg` and reports in `docs/CODEX_M9_REVIEW.md` / `docs/DEV_AI_VERIFICATION.md`. This documentation checkpoint uses `[skip ci]` and does not change the deployed code. M9 accepted; Claude has no new task.

## 2026-11-14 Codex · M9 accepted locally and ready for dev

- Independent review of A/B, adverse closures and provenance. Official sheet, own export and portable package; science and M8 core intact. Readability adjustments (12 px minimum), understandable load errors and historical warnings updated only in presentation.
- 316 Python, 246 web (+2 opt-in skipped), typecheck/build, baseline49 intact. Deterministic ZIP of 31 entries, SHA-256 `eed86833…6520c`. Offline browser in subfolder, mobile/keyboard, missing/invalid load and real download validated.
- Dev publication and remote verification in progress; no promotion to main. Report in `docs/CODEX_M9_REVIEW.md`.

## 2026-11-14 Claude Code · M9 phase B (sheet, export, packager) — delivery for review

- Two edge cases of A closed with regressions: `publish` declares `PackageStateError` if it cannot restore the backup of the same pair; GeoJSON rings must close exactly.
- Pure policy separated into `pipelines/geology_policy.py`; single validator `geology_contract` (without Shapely/pyproj/requests) with self-contained export `geology-export`. Web: mirror validation, loading with a timeout that covers the body, compact/expandable sheet with honest rounding and JSON download. Packager with optional, validated geological package.
- 316 Python, 245 web, build and repeated ZIP identical (31 entries, SHA-256 `579a4fed…74be`); baseline intact. No commit, push or deploy; browser QA and publication handled by Codex.

## 2026-11-14 Claude Code · M9 phase A corrected after Codex's review

- Five findings closed with regressions: total area change limit in repairs (non-positive original ⇒ rejection with mask), structural validation of each vertex before Shapely and before installing the cache, cache+package transaction with rollback (`prepare_raw` + `publish`), exact provenance per sector (role, `site_id`, URL bbox without rounding) and the Chilean one tied to the layer download.
- Cache with name/symlink checked before opening; license read from CKAN (rejection if not cc-zero); format narrative only from what was observed; SIGAM corrected; method aligned with the overlay in EPSG:6933. Code text test replaced by a functional one.
- Real package recalculated from the cache without network (SHA-256 `fe2552dd…856c`, identical rebuild). 297 Python, 196 web, typecheck and build correct; baseline intact. Phase B pending; `release:package` keeps failing until B. No commit or push.

## 2026-11-14 Claude Code · M9 phase A (data, contract, tests) — delivery for review

- Bounded public acquisition (CKAN + Chile ZIP inspected by content + one WFS 1.0.0 per Argentine sector), ignored raw cache with exact request/SHA-256/`acquired_at`, validation of truncation, CRS, ranges and bbox per entity. No credentials.
- Clipping/partitioning in the EPSG:6933 plane with ambiguity, gaps and missing description kept separate; `make_valid` vs `buffer(0)` repair with 0,1 %/0,05 % limits and conservative mask on rejection; conservative states. Contract `geology-context` + semantics (exact geometry, area closure, recalculated state).
- Real package of seven sectors; identical offline rebuild. 248 Python, 196 web, typecheck and build correct; baseline intact. `release:package` fails until phase B (packager list). ADR-010 proposed. No commit or push; phase B pending.

## 2026-11-14 Codex — M9 authorized and assigned to Claude

- Dan approved implementing and releasing the recommended geological context. M9 assignment in NEXT_TASK, data and product review between phases, M8 archived and baseline protected.
- Two official sources, seven sectors, explicit coverage/ambiguity, sheet/export and offline package. Science, rankings and current AI preserved. Codex verifies before dev.

## 2026-11-14 Codex — assessment of value and effort of official geology

- The seven v3 geometries audited against real public data: SERNAGEOMIN via MMA and WFS SEGEMAR. Chile ≈99 % coverage at 1:1M; Argentina 50/0/100 % at 1:250K. Alternatives 1M/2,5M tested without confusing their detail or silently filling gaps.
- Interchanged formats detected in the Chilean catalog, invalid geometries and overlaps; SHP/GeoJSON contrast of 306 nearby geometries without discrepancies. Individual and regional Argentine queries agree when clipped.
- Report `docs/GEOLOGY_FEASIBILITY.md`, offline calculation and evidence with hashes in `docs/research/geology/`. Recommendation: first descriptive cut, 20–32 estimated hours; geological ranking/calibration pending. Implementation was not assigned to Claude and nothing was published.
- Local public cache of 20.873.381 bytes in `data/raw/geology-feasibility-20261114/` ignored; research dependencies isolated in `/tmp`. No changes to app, AI or science. `npm run verify`: 177 Python, 196 web, typecheck/build correct; 2 opt-in skipped.

## 2026-11-14 Codex — dev and real AI verified

- Corrected publication `9060970`, Actions 43639834860 successful, alias `https://analogos-dev.vercel.app/`. Main and access protection unchanged.
- Real test from the browser: draft of three requirements (`req_011Ch3V9sX8XWfnCFHCehTem`) and explanation (`req_011Ch3VD7AVeY7uEpeKT9i9e`), both with `claude-sonnet-5-5`. One prioritized area and six discarded; permits remain pending.
- Downloaded JSON validated against the contract and identical local recalculation. Synthetic export and capture in `submission/evidence/m8-dev-ai-export.json` and `submission/assets/analogos-m8-dev-ai.png`.
- Evidence and operation in `docs/DEV_AI_VERIFICATION.md`. Final deterministic ZIP: 30 entries, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`; 38 baseline hashes intact. 177 Python and 196 web correct, plus startup of the real package in CI.
- This checkpoint only adds documentation and evidence, with `[skip ci]`; it preserves the already verified deployed code. Claude is left with no new assignment.

## 2026-11-14 Codex — execution fix on Vercel

- The first M8 deploy (`707d4b1`, Actions 43639120488) built and published, but the AI test in the browser revealed `ERR_REQUIRE_ESM`: the Node function required modules inside the web ESM package.
- The same pure core was extracted to `shared/`, with compatible reexports for the frontend and direct imports from the server. No changes to rules, data or dependencies. Server typecheck aligned with NodeNext.
- New startup check on the function as actually packaged before deploy: it loads modules, snapshot/contracts and validates GET 405 and POST without a key 503. Also verified with a local Node build.
- Repeated 177 Python, 196 web (+2 opt-in omitted), typecheck and build. Second publication and real remote test in progress.

## 2026-11-14 Codex — M8 publication to dev authorized

- Dan requested a commit/push to dev and a check of the remote AI. Deployment prepared with `ANTHROPIC_API_KEY` as a GitHub secret, injected by `vercel deploy --env` only into the dev runtime. Main and Vercel protection are kept.
- Prior verification repeated: 177 Python, 196 web (+2 opt-in tests omitted), typecheck and build all correct. Actions will be followed and both operations will be checked from the protected web.

## 2026-11-14 Codex — local acceptance of M8

- Reviewed Claude's implementation and verified the fixes for geometry, scale, timeout, AI state, export and presentation. Codex's final adjustment: tiny thresholds keep scientific notation and the coverage label works for one or seven windows.
- Final independent verification: 177 Python, 196 web (+2 real-AI tests omitted by default), typecheck/build; 10/10 additional audit cases. The 38 baseline hashes remain intact.
- Browser: test/sector walkthroughs, real AI for draft and explanation, export with provenance, invalidation, zero prioritized, points and coverage, keyboard and mobile. Manual ZIP under `/AnalogOS/` with external network blocked.
- Final deterministic ZIP: 30 entries, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`; contents checked against dist and without a key. Screenshot `submission/assets/analogos-m8-review.png`.
- Report `docs/CODEX_M8_REVIEW.md`; NEXT_TASK and ADR-009 accepted locally. Pending: deployment/testing on Vercel and visual inspection of native printing. There is no commit, push or new task for Claude.

## 2026-11-14 Claude Code · M8 revision B (presentation)

- Shared formatting (`mission/format.ts`): human units and es-CL numbers in reasons, tables, confirmation and report; JSON with canonical unit unchanged.
- Confirmation with effective conditions and requested geometry; printed report with the effective condition per requirement and requested/measured geometry in text even when there are no options.
- "This version" instead of "M8" in user-facing texts; scale "Full window (~20 km)"; hero without a traction promise.
- Verification: 177 Python, 196 web (+2 real-AI omitted), server typecheck, build; Codex audit 9/9; repeated ZIP identical (SHA-256 `7b2b30b5…d2ec`); baseline of 38 files intact. No new AI calls. No commit or push.

## 2026-11-14 Claude Code · M8 test- and sector-guided recommendation (delivered for review)

- Fix from A's review: geometry only with epsilon 1e-9°, timeout covering reading of the body, export with AI draft and explanation separated and semantically validated, provider output validated with Ajv, scale/figures anchored to the brief, unsupported "other objective". Independent audit 9/9 (includes AI response with foreign fingerprints ⇒ error, and failed retry that preserves provenance).
- Stage B: integrated planner (`components/planner/`), pure state with invalidation and protection against late responses (`mission/plannerState.ts`), local SVG diagram, result, printable report and validated JSON; entry points in the hero and a button in the detail card.
- Optional AI server (`server/ai/`, `api/ai.ts`) and local server in the Vite plugin; contracts `mission-*`; docs `AI_SETUP`, architecture, product, acceptance guide and README.
- Verification: 177 Python, 196 web (+2 real-AI omitted), server typecheck, build; repeated ZIP identical (SHA-256 `7b2b30b5…d2ec`); baseline of 38 files intact. Real AI recorded in `project/M8_PROGRESS.md`.
- Pending: Codex review (CUA, Vercel unpublished). No commit or push.

## 2026-11-14 Claude Code · redesign merged into dev

- `redesign/planeta-3d` merged into `dev` (fast-forward) by direct decision of the human team, without Codex review: global liquid glass, background globe with switch to 2D, floating detail card, score breakdown with magnitudes and Sentinel-2. series
- Globe ADR renumbered to ADR-007; ADR-006 and ADR-007 accepted by the team.
- `npm run verify` (128 Python, 1 omitted; 52 web; build) and `npm run release:package` green; ZIP of 24 files with SHA-256 verified.
- Pending: `CLAUDE.md` still says "SVG map, not MapLibre or WebGL"; the team or Codex must update it.

## 2026-11-14 Claude Code · score breakdown with real magnitudes

- `breakdown/ScoreBreakdown.tsx`: each criterion is drawn with its magnitude and unit; topography is drawn against Jezero (MOLA). There is a slope ramp (exaggeration ×5 labeled), roughness profiles to scale, relief mountains, a grid of 100 Sentinel-2, pixels, a rain gauge and a thermometer with the profile's marks (25 mm/year, saturation at 45 K).
- The ring shows `normalized_similarity` from the pipeline without recalculating it; the text explains how it derives from the value (ratio of medians, 1/(1+mm/25), saturation, fraction), verified against the three sectors.
- `domain/marsReference.ts` reads `mola_reference` from `analysis-summary.json` (optional); 2 new tests.
- Liquid glass: panels with internal scroll draw the border with shadows so it does not move with the content.

## 2026-11-14 Claude Code · global liquid glass

- `liquid/liquid-glass.css` and `liquid/LiquidGlass.tsx`: the effect is no longer only on the navbar and is applied to panels, cards, metrics, criteria, notices, chips, buttons and controls over the globe.
- Layers: translucent tint with blur, specular highlight that follows the cursor (a single listener with rAF), iridescent light border, internal edge and caustic, compression on press.
- Real refraction with an SVG filter in Chromium for floating controls; other browsers use blur only. Respects `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Background with blue/orange blobs in slow drift so the glass has something to refract.
- Screenshots of `submission/assets/`, ZIP and `SHA256SUMS.txt` regenerated.

## 2026-11-14 Claude Code · liquid glass redesign (branch redesign/liquid-glass)

- New palette: navy #02070A, blue #0297DE (interaction, similarity, selection) and orange #FC734D (warnings, fixture, emphasis). Confidence uses a distinct ice tone.
- Glass surfaces (`.glass`) with blur and light borders; alias `--accent/--sand/--mint` for compatibility with the globe styles.
- `LiquidNav`: navbar with a WebGL drop (adapted from Nimbus UI "Waterline"), CSS fallback without WebGL and section scroll-spy.
- `SignalCard` + `SurfaceSignals`: monthly Sentinel-2 2025 series (BSI and NDVI) per sector, adapted from "Market Card" (Louis Studios). When the zone changes, the card animates its exit and replays the entrance with the new series. Visualization only: they do not alter the score.
- `parseSurfaceSeries` validates `analysis-summary.json` (optional) without interpolating missing months; 4 new tests.
- Detail card with animated entrance on zone selection; selected marker with pulse; workspace with fixed height and internal scroll on desktop (the map used to fall out of view with long cards).

## 2026-11-14 Codex

- Created handoff package for Claude Code.
- Froze the P0 stack.
- Added profile, candidate and manifest contracts.
- Added backlog with gates M0–M6.
- Added continuity protocol for resuming with Codex.
- Competitive implementation has not yet been started in this folder.

## 2026-11-14 Claude Code

- M0 closed: npm monorepo + Python package `pipelines`, Vitest and pytest configured.
- M1 closed: NON-scientific fixture snapshot in `artifacts/demo/` and web with map, ranking, detail card and breakdown.
- Contract validation in Python (jsonschema) and on the web (Ajv), with the same schemas.
- Deterministic aggregation in `pipelines/scoring.py` (brings forward part of M2): weighted geometric mean, epsilon, minimum valid weight 0,70 and separate confidence.
- `python -m pipelines.build_demo` generates the snapshot; a test detects if it falls out of date.
- Local Chile outline (Natural Earth, public domain) so the map does not depend on external services.
- Verified: `npm run test` (11), `npm run build`, `python -m pytest` (15) and manual review in the browser.
- No changes to `contracts/`, the P0 profile or frozen decisions; there was no ADR. Details of decisions in `project/STATUS.md`.
- Pending for M2: constraints with traceable reasons and sensitivity.

## 2026-11-14 Codex — resumed after Claude

- Resolved the conflict between the two web implementations; a single buildable app was kept and integrated.
- Replaced MapLibre with a local SVG map after detecting an empty panel in a browser without reliable WebGL; decision recorded in ADR-001.
- Closed M2: traceable constraints `exclude/review/warn`, weight sensitivity of ±20 % and exclusion tests.
- Added a reproducible pipeline without credentials for NASA PDS MOLA, NASA SRTM via Terrain Tiles and NASA POWER.
- Generated `artifacts/science-v1/` with three real screening candidates; scientific decision recorded in ADR-002.
- Result: Yungay 73,65; Domeyko 65,11; María Elena 40,70. Confidence 57,8 and feasibility `requires_review` for all three.
- The final app uses the scientific snapshot; fixtures are kept only for tests.
- Added comparator, stability, expandable warnings, sheet download and methodology within the app.
- Created a bilingual presentation package, pitch, demo, methodology, results, attributions, screenshot and checklist.
- Verified: 25 Python tests, 12 web tests, strict TypeScript and static Vite build of ~552 kB.

## 2026-11-14 Codex — post-Claude closure

- Audited the entire tree and confirmed that there were no changes after the checkpoint at 10:30.
- Removed three unimported leftovers from Claude's first implementation: `ScoreBreakdown.tsx`, `DataProvenance.tsx` and `styles/app.css`.
- Re-ran `npm run verify`: 25 Python tests, 12 web tests, contracts, TypeScript and build all green.
- Verified again the static ZIP and its SHA-256 checksum; the deployable content did not change.

## 2026-11-14 Codex — authenticated snapshot v2

- Successfully tested the Earthdata Login credentials and the Copernicus OAuth Client Credentials.
- Added reproducible dependencies `earthaccess`, `requests` and `python-dotenv`.
- Detected and fixed an edge error: Pampa Yungay crosses four NASADEM tiles; v1 analyzed only one SRTM tile.
- Downloaded six `NASADEM_HGT.001` granules with HGT and SWB mask.
- Queried 677 HLS S30 v2.0 granules in total as an independent NASA inventory, without spectral double counting.
- Processed 12 monthly Sentinel-2 L2A mosaics per site via the Statistical API with SCL, NDVI and BSI.
- Generated `artifacts/science-v2/`: Yungay 75,67; Domeyko 71,60; María Elena 49,99; confidence ~77,4.
- Added permanent water screening; María Elena retains a warning for ~0,15 %.
- The final web app now loads `science-v2`; documentation, pitch, methodology and attributions updated.
- Added ADR-003 and tests for multi-tile mosaics, authenticated sources, ranking and absence of secrets.
- Verified: 30 Python tests, 14 web tests and static Vite build green.

## 2026-11-14 Codex — final packaging v2

- Aligned `submission/README.md` and `submission/DEMO_SCRIPT_2_MIN_ES.md` with the v2 results; no v1 figures remain in the active presentation material.
- Updated the versions of the Python package, monorepo and frontend to `0.2.0`.
- Added comparison and method anchors for navigation and reproducible capture.
- Regenerated the two presentation screenshots with the v2 snapshot and visually verified the compiled app with no console errors.
- Regenerated `submission/analogos-chile-static.zip`, checked its integrity and updated `submission/SHA256SUMS.txt`.
- Excluded `demo/` and `science-v1/` from the deployable build to keep `science-v2/` as the single delivered source of truth.
- Confirmed that `.env` and `data/raw/` are ignored and that no credentials appear in code or deliverable artifacts.

## 2026-11-14 Claude Code — publication and labels

- Initialized its own Git repository (branch `main`) and published commit `becd783` to https://github.com/hori0729/AnalogOS; `.gitignore` adds `*.egg-info/` and `.claude/`.
- Profile `mars-rover-screening-v2` becomes `2.0.1-preliminary`: two new limitations clarify that quality is assigned by source (ADR-003), what `validated` means and that the topographic comparison is a ratio of medians. No changes to weights, criteria or scores.
- Regenerated `artifacts/science-v2/`: only `mission-profile.json` and `candidate-details.json` change (profile version, limitations and percentages with decimal comma). Similarity, confidence, stability, `manifest.json` and `analysis-summary.json` remain identical.
- Web: a single order (`rankCandidates`) in ranking, map, comparator and initial selection; area with two significant figures (≈ 450 km², previously ≈ 500); decimals with comma on the map; confidence is labeled "Quality assigned by source".
- `submission/METHODOLOGY.md` documents the above; regenerated `analogos-chile-static.zip` and `SHA256SUMS.txt`.
- Verified: 30 Python tests, 14 web tests, build and browser review with no console errors.
- Published to `origin/main` as the second commit.
- Destination changed by team decision: `origin` becomes https://github.com/Esteban12-hori/AnalogOS (private). https://github.com/hori0729/AnalogOS remains as a secondary remote `hori0729`, with the first two commits and no further updates.
- Incorporated three changes made by another process at 12:15: `README.md` and `docs/ARCHITECTURE.md` aligned with the SVG map and `science-v2`, and `tests/test_precision_artifacts.py` with the optional raw NASADEM test plus a new test on the versioned analysis. Verified: 31 Python tests here; 30 green and 1 skipped in a clean clone without `data/raw/`.
- Pending: the two screenshots in `submission/assets/` predate these labels.

## 2026-11-14 Codex — handoff closure in the definitive repository

- Confirmed that `origin/main` and the local HEAD match at `92053ea` for `https://github.com/Esteban12-hori/AnalogOS`.
- Removed the obsolete local remote `hori0729`, whose repository no longer responds, to avoid publishing by mistake to the previous destination.
- Validated the compiled app with profile `2.0.1-preliminary`, area ≈450 km² and label "Quality assigned by source".
- Regenerated `submission/assets/analogos-chile-overview.jpg` and `analogos-chile-comparison.jpg` with the current labels.
- Verified the suite with local data (31 Python tests) and simulating a clone without `data/raw/` (30 green, 1 NASADEM integration skipped).

## 2026-11-14 Claude Code — screenshot review (local, no commit, pending team decision)

- Finding: at 1280×720 and 1440×900 the map fell outside the first screen. The SVG was vertically centered in a panel ~1.500 px tall (the grid row grows with the sheet), so the `analogos-chile-overview.jpg` screenshot at 12:20 showed the map panel empty.
- One-line fix in `apps/web/src/components/CandidateMap.tsx`: `preserveAspectRatio` changes from `xMidYMid meet` to `xMidYMin meet`; the map is anchored at the top. No changes to science, contracts, profile, snapshot or ranking.
- Regenerated `submission/analogos-chile-static.zip` and `SHA256SUMS.txt` with the new build.
- Replaced `submission/assets/analogos-chile-overview.jpg` with a 1280×720 headless Chrome screenshot with the map visible. The version from 12:20 was not in Git and is not preserved. `analogos-chile-comparison.jpg` remains as Codex left it.
- Verified: 31 Python tests, 14 web tests, build and visual review at 1280×720 and 1440×900 with no console errors.
- These changes were made before reading `project/NEXT_TASK.md` (created at 12:28). There is no commit or push; `AGENTS.md`, `CLAUDE.md`, `project/HANDOFF_PROTOCOL.md`, `prompts/START_CLAUDE.md` and `project/NEXT_TASK.md` were not touched.

## 2026-11-14 Codex — technical direction Codex → Claude

- Fixed `CLAUDE.md`, which still described Claude as temporary lead of M0/M1 and required MapLibre; it now reflects M6, local SVG and the v2 snapshot.
- Established the work chain: Codex defines/reviews/accepts; Claude implements; the human team retains final authority.
- Created `project/NEXT_TASK.md` as the only authorized queue, with owner, status, branch, base commit, scope and constraints.
- Updated `AGENTS.md`, `prompts/START_CLAUDE.md`, `prompts/RESUME_CODEX.md` and `project/HANDOFF_PROTOCOL.md` to prevent out-of-scope work, self-approval or pushes to `main` without authorization.
- Implementation branch set to `dev`; `main` reserved for reviewed deliveries.
- Reviewed and accepted Claude's final adjustment in `CandidateMap.tsx` (`xMidYMin`): it improves the 16:9 screenshot without changing data, score or contracts; ZIP and checksum consistent.

## 2026-11-14 Claude Code — M6-PORTABLE-RELEASE (delivered in `review`, no commit)

- New `npm run release:package`: chains `npm run build` with `scripts/package_release.py` (standard library only).
- `apps/web/vite.config.ts` uses `base: './'`; the build loads at `/` and in a subdirectory. There was no need to touch `loadDemoSnapshot.ts` or `App.tsx`: they already used `import.meta.env.BASE_URL`.
- The packager supports only `index.html`, the JS/CSS files that this HTML references relatively, and the five `science-v2/` files. It rejects additional files, symbolic links, absolute or external references, and missing files.
- Deterministic ZIP: alphabetical order, fixed internal date, fixed permissions, and no compression. Three consecutive runs produced the same SHA-256 (`beb83736…68ac14`); the ZIP's file list and its bytes match `apps/web/dist/`.
- After Codex's review: unique temporary files with `mkstemp`, paired replacement with restoration of the previous ZIP if the checksum one fails, and upfront rejection of `--zip` equal to `--checksum` or of destinations inside the build. Documented limit: no atomicity against abrupt interruptions between the two renames.
- `tests/test_release_package.py`: 29 cases on temporary directories (determinism, exact set, missing files, unexpected files, symbolic links, non-portable references, preservation on error, rollback, failed rollback, invalid destinations, and unique temporary files).
- Verified: `npm run verify` (60 Python tests, 14 web tests, build), `npm run release:package`, `shasum -a 256 -c`, `git diff --check`. Local HTTP test with headless Chrome at `/AnalogOS/` and at `/`: the app renders and all requests respond 200 (only `favicon.ico` gives 404,, same as before).
- Documented in `README.md`, `submission/README.md` and `docs/decisions/ADR-004-portable-static-release.md` (status `proposed`).
- No changes to science, contracts, profile, snapshot, ranking, or dependencies. No commit, push, or publication.

## 2026-11-14 Codex — acceptance of M6-PORTABLE-RELEASE

- Assigned the implementation to the existing Claude Code session and supervised it until its return in `review`.
- Reproduced a failure in the first version: the second replacement could leave a new ZIP with the old checksum. Returned to Claude; accepted the fix with restoration, unique temporary files, and rejection of overlapping destinations.
- Independently re-ran `npm run verify` (60 Python, 14 web, contracts, TypeScript, and build), `npm run release:package`, checksum, and `git diff --check`: all correct.
- Checked the ZIP's determinism and its eight entries byte by byte against dist and against the copy tested over HTTP at `/` and `/AnalogOS/`. Verified ranking, map, selection of María Elena, water warning, and absence of console errors.
- Confirmed the six original hashes of snapshot v2 and the configuration profile. Preserved the team's previous changes; HEAD remains at `92053ea` on top of `dev`.
- ADR-004 and assignment accepted, with limits for abrupt interruption and HTTP documented. Claude remains awaiting a new assignment. No commit, push, or publication.

## 2026-11-14 Codex — dev checkpoint authorized by Dan

- Dan explicitly authorized commit and push of the reviewed changes to `dev`.
- Integrated by fast-forward `6516743` and `3c1a014` from `origin/dev`: Vercel configuration and ignoring of `.vercel`; no conflicts with the local delivery.
- The checkpoint brings together the accepted portable packager, its documentation and tests, the Codex/Claude coordination, and the already reviewed map and screenshot adjustments.
- Before the commit, `npm run verify` was repeated: 60 Python tests, 14 web tests, contracts, TypeScript, and build all correct.

## 2026-11-14 Claude Code — M4-VISUAL-EVIDENCE (delivered in `review`, no commit)

- New `pipelines/fetch_visual_context.py`: one request per candidate to the Copernicus Sentinel Hub Process API (`sentinel-2-l2a`, B04/B03/B02, window 2025-12-01 to 2026-01-01, `leastCC`, maximum cloud cover 40 % per scene). Result in `artifacts/visual-context/`: three real PNGs of 705–714 × 768 px and a `index.json` with the request, evalscript, returned metadata, query time, and SHA-256.
- The first run failed because of the network when requesting the token (three attempts, nothing written); the second worked. Each view came from a single orbit with 100 % valid pixels: Yungay and María Elena, 2025-12-21; Domeyko, 2025-12-03.
- A valid local package is reused without network or credentials; `--refresh` queries again. Generations are not mixed, and on error the previous one is kept.
- After Codex's review: the validator requires that all the metadata presented (bbox, period, collection, transformation, identity, snapshot, dimensions, scenes) match the candidate, the request, the PNG, or the returned metadata; `_swap` reports the real state and keeps the backup if it cannot restore or clean up; the web validates each element of `scenes_used` and requires unique `image === site_id + ".png"` and `site_id`.
- Web: «Satellite context» panel in the detail sheet (`VisualContext.tsx`, `loadVisualContext.ts`) with local image, period, attribution, preliminary note, link to the image, and provenance. Falls back to «not available» with fixtures, missing or invalid index, and failed image. It does not touch score, confidence, or feasibility; the browser only requests local files.
- Packager: explicit list extended with `visual-context/index.json` and three PNGs with fixed names, with verification of their SHA-256 against the index. ZIP of 12 files and 4.084.880 bytes.
- Verified: `python -m pipelines.fetch_visual_context` (reuses without network), `npm run verify` (119 Python tests, 24 web, build), `npm run release:package`, `shasum -a 256 -c`, `git diff --check`. In browser: image per candidate, candidate switching, provenance, image error, mobile view, and `/AnalogOS/` over HTTP, with no console errors.
- Documented in `docs/VISUAL_REVIEW.md`, ADR-005 (`proposed`), `README.md`, `submission/README.md`, `submission/ATTRIBUTIONS.md`, `submission/JUDGING_CHECKLIST.md` and `project/BACKLOG.md` (partial progress on M4).
- No changes to `artifacts/science-v2/`, profile, contracts, score, ranking, or dependencies. The Copernicus credentials were used only from the program and against the official hosts; they do not appear in artifacts or logs.

## 2026-11-14 Codex — acceptance of M4-VISUAL-EVIDENCE

- Supervised the existing Claude session until its return in `review`, including a retry after a connection failure.
- Inspected the three real PNGs and their provenance. The rectilinear traces and geometric shapes observed remain as clues for territorial contrast; they do not change feasibility or authorize access.
- Returned and verified the validation defects for bbox/period, malformed scenes in the web, and incorrect messages on restoration failure.
- Own verification: 119 Python tests, 24 web, contracts, TypeScript, build, packaging, checksum, and diff all correct. Cache demonstrated without network; 12 ZIP entries identical to the build and deterministic packaging.
- Browser: selection of three candidates, provenance, ZIP under `/AnalogOS/`, missing PNG, and invalid index without breaking ranking/detail sheet. The six scientific hashes remain intact.
- ADR-005 and task accepted. M4 remains partial pending recent images, territorial review, and expert review. Local changes on `dev`, without commit or push; Claude returns control.

## 2026-11-14 Codex — visual context checkpoint for dev

- Dan authorized commit and push of M4-VISUAL-EVIDENCE to `dev`.
- The checkpoint incorporates the three real PNGs and their provenance, the offline panel, validators and tests, documentation, and the reviewed ZIP and checksum.
- Pre-commit verification: `npm run verify` (119 Python tests, 24 web and build), ZIP checksum, and `git diff --check`.

## 2026-11-14 Claude Code — branch `redesign/planeta-3d`

- 3D Earth globe in the explorer (three.js, R3F, drei) with local NASA textures, atmosphere, and candidate polygons.
- SVG map kept as an alternative and automatic fallback without WebGL (ADR-004, proposed; later renumbered to ADR-007).
- Pure spherical geometry in `src/domain/globe.ts` with tests; three.js in a deferred chunk.

## 2026-11-14 Claude Code — layout redesign in `redesign/planeta-3d`

- Merge of `dev` (visual context ADR-005, portable delivery, Vercel); `submission/` takes the version from `dev`.
- Globe as background; automatic switch to 2D map (MapLibre) by zoom with hysteresis; active source legend.
- `pipelines/fetch_basemaps.py`: regional Blue Marble and HLS medians per sector from NASA GIBS, in Web Mercator and without gaps.
- Sentinel-2 from ADR-005 on top of each polygon in the 2D view; in the detail sheet, a «View the sector on the 2D map» button instead of the thumbnail.
- The candidate column is removed (1·2·3 selector in the detail sheet) and the repeated snapshot label in the detail sheet; `ScoreBreakdown` integrated.
- ADR-006 proposed. Pending: acceptance against `CLAUDE.md` of `dev` and the packager list.

## 2026-11-14 Claude Code — performance, preloading, and packaging in `redesign/planeta-3d`

- Globe with `frameloop="demand"`, no new objects per frame, and `dpr` limited to 1,5. navbar Water at ~15 fps when there is no interaction.
- Globe textures 2K/1K; `data/preload.ts` preloads textures and chunks; the 2D map is mounted hidden when the browser is idle.
- `vercel.json`: immutable cache on hashed assets and short cache on JSON.
- `package_release.py` reads `.vite/manifest.json` for the deferred chunks and supports explicit `basemaps/`; 7 new tests.


## 2026-11-14 Codex — M7-GLOBAL-DISCOVERY assignment

- Dan authorized AnalogOS with a global vision and a first Chile–Argentina search pilot, using Yungay as the known reference.
- Assigned to Claude a vertical slice: 50 topographic windows in two declared regions, up to six multisource preselections, bibliographic audit, snapshot v3, reference/candidate roles, binational map, export, and offline package.
- Preserve v2 and weights/formulas as the baseline; distinguish regional scope from worldwide coverage and from the absence of precedents of demonstrated novelty.
- Baseline verified before the handoff: 119 Python tests, 24 web tests and build green. No implementation changes, commit, or push in this assignment.

## 2026-11-14 Claude Code — M7-GLOBAL-DISCOVERY (delivered in `review`, no commit)

- Visible brand «AnalogOS» with subtitle «Exploration of planetary analogs · Chile–Argentina pilot». Folder, remote, and packages do not change.
- Reproducible search: `config/discovery_search_v3.json`, `pipelines/discover_candidates.py` and `pipelines/fetch_discovery_data.py`. 50 windows of 0,2° in two test regions, topographic priority with relative weights 0,20/0,20/0,15, up to 3 per country with centers at ≥ 25 km. Each window stores its rationale.
- Stage result 1: 50 evaluated, 4 excluded due to published sampling coordinates, 2 due to proximity, 38 outside the quota and 6 preselected (3 per country).
- Snapshot `artifacts/science-v3/` with `pipelines/build_discovery_snapshot.py`: six candidates and Yungay as the reference, with the v2 formulas and weights. Yungay retains 75,67 / 77,45 / 99,03. The Chilean candidates obtain 94,87 / 91,87 / 90,35 and the Argentine ones 63,85 / 53,68 / 49,43; they match Codex's independent calculation.
- Background: `config/analog_precedents_v1.json` with the 30 coordinates from the supplementary material of Navarro-González et al. (2003) and sources on Atacama and the Puna; three targeted searches recorded. No candidate is declared new.
- Contracts: `candidate-site` supports `cl-`/`ar-`, adds `country`, `role`, `discovery`, `literature_review` and the `reference` status; new `discovery-search` and `precedent-catalog`. Historical snapshots still validate.
- Quality without false confidence: Sentinel-2 completeness against 12 months with rejection of malformed rows, topographic quality × coverage, POWER validation and a cache tied to the exact request. The v2 values do not change.
- Fixes after Codex's reviews: per-window data failures without aborting the search, request identity in the build, strict Sentinel-2 and POWER rows, wording "matching values; possible shared cell", search without preselection as a negative experiment, and accessible map label.
- Web: search scope, ranking with country filter, separate reference card, regional SVG map with the 50 windows, both countries and a location inset, "Origin and background" section in the profile, and export with role, origin and scope.
- Visual context v3 in `artifacts/visual-context-v3/`: six new images and the Yungay one reused from the v2 package. Preliminary observations in `config/visual_observations_v3.json`, visible as a warning.
- Packager v3: list derived from validated metadata; `submission/analogos-static.zip` (18 files, 9.012.267 bytes) with `analogos-static.zip.sha256`. The v2 ZIP is preserved.
- Documentation: ADR-006 (`proposed`), `docs/DISCOVERY_REPORT.md`, README, product and science documents, `submission/` material and `assets/analogos-pilot-overview.jpg` capture.
- Verified: 167 Python tests, 39 web tests, build, byte-for-byte repeated packaging, demo at `/AnalogOS/` over HTTP and clean `git diff --check`. v2 and its artifacts unchanged.
- Network usage: 7 NASADEM tiles, 6 Statistical API queries, 6 POWER, 6 HLS inventories and 6 Process API images, all within the limits; credentials only from the program.

## 2026-11-14 Codex — M7-GLOBAL-DISCOVERY acceptance (15:33)

- Claude's implementation accepted as AnalogOS's regional pilot: 50 windows, six candidates, Yungay reference outside the ranking and visible precedents. No confirmed discoveries or global coverage are declared.
- Independently repeated: 167 Python tests, 39 web and build; byte-for-byte rebuild of v2/v3; 11 baseline hashes; caches of 18 entries and visual packages v2/v3 without network/login.
- Recalculated the 50 priorities, the selection and the six similarities/confidences from raw data. Verified the bibliographic points and the six new images. Corrections returned to Claude and regressions included.
- Browser: Argentina filter, profiles, reference, real export with role/origin, map keyboard, mobile and ZIP extracted at root and /AnalogOS/. No application errors during the check.
- Deterministic ZIP: 18 entries, 9.012.267 bytes, SHA-256 3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415. v2 baseline intact.
- ADR-006 and NEXT_TASK accepted; independent report in docs/CODEX_M7_REVIEW.md. Updated STATUS, BACKLOG, continuity instructions and active product/science references to avoid reverting to v2.
- Explicit pending items: territory, complete Puna bibliography and local climate contrast. Claude awaits a new assignment. No commit, push or publication.

## 2026-11-14 Codex — reviewed integration authorized for dev

- Dan asked to "update dev". M7 scientific checkpoint saved in 1302ed8 and integrated with the team's remote redesign, preserving its decisions and deployment. Discovery ADR renumbered to 008; the team's ADR-006/007 preserved.
- Connected v3 to globe/2D, floating profile, series and breakdown. Yungay REF stays outside the ranking in all views. The Search section keeps scope, grid and country filter. Fixed v3 image paths, ranking propagation and fitting of long names.
- 177 Python tests, 69 web and build correct. Repeated ZIP identical: 30 entries, 12.865.983 bytes, SHA-256 804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b. Eleven v2 scientific baseline hashes and v3 artifacts unchanged.
- Reviewed the ZIP served at /AnalogOS/: globe, Argentina and Sentinel-2 in 2D, Yungay as reference, country filter, desktop and mobile without horizontal overflow. Capture submission/assets/analogos-integrated-dev.jpg. Updated stack instructions, delivery and review report.
- Commands: source .venv/bin/activate && npm run verify; npm run release:package. No new data acquisitions or weight changes. Scientific pending items: territory, Puna bibliography and local climate. Claude awaits a new assignment.

## 2026-11-14 Codex — fix of the dev alias on Vercel

- Integration published to origin/dev (8df83c0), local tree clean and remote SHA verified. Actions 43629101506 completed build/deploy, but failed when assigning analogos-dev.vercel.app with "User not found", the same error as the previous run 43628749578.
- The alias step now explicitly passes --scope "$VERCEL_ORG_ID", using the team already configured in the workflow. Reference: https://vercel.com/docs/cli/global-options#scope (accepts team slug or ID).
- Change limited to deployment and status record; it does not require rebuilding the ZIP or repeating scientific tests. It is validated by running the workflow on dev.

## 2026-11-14 Codex — alias via team API

- Run 43629219568: build/deploy correct; the alias CLI still tries to load a user and returns 404 even with --scope. That step was replaced with POST /v2/deployments/{hostname}/aliases?teamId=... of the official API, with the same workflow secret, timeout and verification of the returned dev alias.
- Reference: https://vercel.com/docs/rest-api/aliases/assign-an-alias. Permissions, secrets and the approved target are not changed. The secret is used through an environment variable and is not printed.

## 2026-11-14 Codex — M8-MISSION-RECOMMENDATION assignment

- Dan authorized converting the product into a trial/sector evaluation definition, recommendation with data and AI, and Claude's supervision. Selected provider: Anthropic.
- M7 archived in project/tasks/M7_GLOBAL_DISCOVERY.md. NEXT_TASK assigns M8 to Claude with a plan checkpoint, verifiable criteria and handback to Codex.
- ADR-009 authorizes a deterministic requirements layer on top of v3, Yungay as a known alternative, geometries with explicit coverage and a minimal optional AI API. No new data or profiles; aggregated evidence is not transferred to different polygons.
- Baseline 4d197e1 verified: 177 Python, 69 web, build; 38 science/config/contract hashes in /tmp/analogos-m8-baseline-hashes.json. Previous publication verified in Actions and authenticated browser.

## 2026-11-14 Claude — M10-GEOLOGY-AI (under Codex review)

- The AI explanation can use the official M9 geological context (opt-in): closed catalog of unit+purpose pairs computed on the server, selection by AI (≤3 per sector, ≤12), deterministic guidance without AI, limits always visible. No changes to score, ranking, statuses, weights or artifacts. ADR-011 proposed.
- M9 validator moved to `shared/geology/` (web re-exports). Server loads the package with SHA-256 of candidate bytes; specific 409 errors before the provider; bounded `vercel.json` `includeFiles` and `check-vercel-function.mjs` exercises loading, absence and corruption.
- Export: `analogos-mission-geology-export` v1 wrapper (embeds M8 1.0 intact) with a validator that recomputes catalog/selection/guidance; M8 1.0 and M9 unchanged.
- Tests: 316 Python, 314 web (+3 skipped), typecheck/build; ZIP 31 entries SHA-256 `b2153f69c07be2edc1980c86d7d3eab6b8839b3556c0b244b6b618f8988a1b44` repeated identical; baseline of 24 files intact. Real AI with two contrasting objectives OK after fixing a truncation (`max_tokens` 6000 with channel).
- Commands: `source .venv/bin/activate && npm run verify`; `npm run release:package`; `ANALOGOS_LIVE_AI=1 npm -w apps/web run test -- src/tests/aiLive.test.ts -t "orientación geológica" --silent=false`. Gaps: no real `vercel build` or browser QA. No commit/push/deploy.

## 2026-11-14 Claude — M10 round 2 (review fixes; under Codex review)

- Wrapper: `subset_fingerprint` of the exact subsets, anchoring of geometry to candidates with bundle, audit and reconstruction of the embedded M8 (`auditMissionExport`), constructor with `{ bundle }`. The three independent repros are now rejected. New contract extended; M8/M9 contracts intact.
- Loader: explicit root truly isolates and cache with bundle identity; startup check runs a copy outside the checkout. UI: clickable/printed official source, fractions with and without overlap, conditional submission warnings, no M8 jargon, AI before the profiles.
- Verify 316 Python / 325 web (+3 skipped); ZIP SHA-256 `22b327cc…70bb` repeated identical; baseline and supplement intact; real evidence in `submission/evidence/m10-live-geology-evidence.json`. No commit/push/deploy.

## 2026-11-14 Claude — M10 round 3: bounded recovery (under Codex review)

- After the `ai_invalid_output` reproduced in dev (4 valid refs in one sector, cap 3): a single second call with a fixed/typed reminder only with a geological channel and a semantically invalid selection; shared total deadline; provenance of the accepted response; no retry on upstream errors or on M8 without geology; caps and validation unchanged. Prompt with effective budget `min(12, 3×sectores)`.
- 316 Python, 332 web (+3 skipped), typecheck/build; ZIP `f76a9055…b122` repeated identical (changes due to `shared/geology/guidance.ts`). No commit/push/deploy.
