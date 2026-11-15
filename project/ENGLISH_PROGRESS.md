# ENGLISH-DEFAULT — progress

## Final acceptance — Codex, 2026-11-15

Completed and published to dev/main at code `fab8ed9`; final Actions `43723813882` / `43724021553` succeeded. See `docs/CODEX_ENGLISH_REVIEW.md` and STATUS for independent checks, final mobile-copy corrections, real-provider evidence, historical compatibility, portable archive and exact QA limits. The phase reports below are historical implementation handoffs. Claude has no new assignment.

## Phase C — code text, plus Phase B review corrections (Claude, 2026-11-15) — Owner Codex / review

This work was done on the same working tree. There were no commits, pushes, branch changes, subagents, network or browser use, and I did not read `.env` or credentials. Codex's Markdown and the comment translations it had already applied were kept: the 111 files of my own comment-only pass were AST-hash checked before and after. README files, submission documents, `outputs/` and the protected evidence were not touched.

### Phase B review corrections (`/tmp/analogos-english-phase-b-review-notes.md`)

- **No language inference.** `displaySource()` now returns the English rendering or the text unchanged. It never adds a marker based on a heuristic.
  - The "original Spanish wording" mark and `lang="es"` are applied only where the provenance is known: official unit descriptions, and the explicit `SPANISH_SOURCE_TITLES` set (two bibliographic titles).
  - `looksSpanish` is now used only by the coverage test.
  - Regressions cover both review examples (`No valid observation is available.`, and an English instruction containing `“tracción”`).
- **Verification provenance.**
  - `verificationDisplayText()` translates only source field checks whose ID is anchored to the site (`<site_id>|fc|<n>`).
  - Generated `|req|` instructions and user labels are rendered as authored.
  - The AI panel (`ResultView`) and the Reading adapter (`explanationToReading`) use it. Print goes through the same adapter.
  - IDs, selection and export bytes are unchanged.
- **Live review items:**
  - **Metrics:** the data-quality paragraph and `aria-roledescription` in `MetricDetails` are English.
  - **Numbers:** `0,0003° nominal (~30 m)` and the other decimal-comma resolutions now render as `0.0003°` (display map only; raw artifact unchanged).
  - **Counts:** "1 matches a sector" / "N match sectors".
  - **Reading loading:** `aria-label="Reading"`.
  - **Distributor:** the geology distributor suffix is now "…(SIGAM), public WFS service", keeping the official name.
  - **Leftover labels:** "Loading local textures…", "Center on", "◆ matches" and "contains N sector(s)" were also fixed.
- **Tests.**
  - `englishRender.test.tsx` gained a "review regressions" block: `MetricDetails` full/rail/sheet for every site, the Reading skeleton label, and a generated `|req|` verification with a Spanish user label left intact.
  - `sourceText.test.ts` gained a provenance block and the decimal-comma coverage.
  - The "◆ matches" assertion in `MarkerLayer.test.tsx` was updated.

### Phase C — what changed (wording only)

- **Comments and docstrings.**
  - **TS/JS:** about 150 remaining Spanish comments in 61 files, including `mapZoom` JSDoc, `flight`, `vite.config`, `check-vercel-function`, validator `.d.ts` headers and the generated-file header. The 111 files edited purely for comments keep an identical executable AST.
  - **CSS:** 13 remaining comments. The CSS with comments stripped is identical.
  - **Python:** the remaining comments and docstrings, plus the `pyproject.toml` description.
- **Test titles.** 869 Spanish `describe`/`it`/`test` titles in 63 web test files were translated with the same meaning. A few titles that described es-CL formatting now describe the en-US behavior the test actually checks. Spanish test-failure messages (helper `Error`s, `expect(…, msg)`, pytest assert/skip messages) are English. No test was deleted: web 898 passed + 3 skipped, Python 335, the same as after the Phase B corrections.
- **CLI help and runtime diagnostics, with their assertions.**
  - **Python:** argparse help, `print` progress lines and raised errors in `pipelines/*` and `scripts/package_release.py`.
  - **Node:** `scripts/check-vercel-function.mjs` (assertions, smoke brief, summary), `build-validators.mjs --check`, the dev API 500 message in `vite.config.ts`.
  - **Workflow:** the echo/throw messages in the workflow.
  - **Assertions:** about 60 `match=`/`in message` assertions in `tests/test_*.py` were updated to the new wording, with the same specificity.
- **Schemas.**
  - `title`/`description` in 8 `contracts/*.json` are English, and a script check proves the schemas are identical once annotations are stripped.
  - The wrapper description now explains both supported versions: 1 ↔ mission 1.0.0, Spanish; 2 ↔ 1.1.0, English.
  - The validators were regenerated with `node scripts/build-validators.mjs`. The only changes are embedded annotation strings and the header; `--check` passes.
- **Workflow.** `.github/workflows/vercel-deploy.yml` step labels and comments are English. The top-level workflow `name:` was left unchanged, because external check names may refer to it. `.env.example` commentary was already English.
- **Frozen output markers.** The `Frozen output text (Spanish)` comments mark Spanish strings that look like diagnostics but are written into artifacts:
  - NASADEM tile errors turned into `decision_reason`;
  - `decision_reason` strings in `discover_candidates`;
  - Sentinel-2 rejection reasons;
  - geology repair diagnostics.
- **ADR-016.** The exceptions are expanded and the corrected fallback rule is documented. Status: proposed, Phases A–C.

### Evidence

- **Verify:** `PATH="$PWD/.venv/bin:$PATH" npm run verify` passes. Log: `/tmp/analogos-english-phase-c-verify.log`.
  - **Python:** 335 passed.
  - **Web:** 898 passed and 3 opt-in skipped. The build also reruns nine snapshot tests; these are not additional server tests.
  - **Build:** typechecks and the build pass, including `build-validators --check`.
- **Repo checks:** `git diff --check` is clean, and all 77 files in `/tmp/analogos-english-protected.json` are byte-identical.
- **Tools:** scans and checks used oxc (`rolldown/utils`) and Python `ast`/`tokenize`. The scripts are in `/tmp/analogos-tools/` (`ast_comments.mjs`, `ast_strings.mjs`, `test_titles.mjs`, `test_diag.mjs`, `ast_hash.mjs`, `py_scan.py`, `py_raise.py`, `py_strings.py`, `css_comments.py`).

### Remaining Spanish — bounded inventory (each category intentional)

The counts come from the scanners above on tracked code. They are heuristic (accent or function-word matches), so they bound the inventory but do not prove UI coverage. Rendered UI coverage comes from `englishRender.test.tsx` and the per-view tests, not from these scans.

| Category | Where | Size | Why it stays |
|---|---|---|---|
| Frozen record packs | `shared/mission/text/es.ts`, the version-1 section of `shared/geology/text.ts`, `EXPORT_DESCRIPTION`/`EXPORT_HOW_TO_READ` in `pipelines/geology_contract.py` | 56 + 54 literals + 2 constants | Rebuild historical 1.0.0 / wrapper v1 / geology export v1 byte for byte |
| Artifact-compared literals | `GEOLOGY_POLICY` notes (`shared/geology/context.ts`), `HISTORICAL_GEOLOGY_LIMITATION` (`geologyCopy.ts`), fixture suffix `(sintético, ubicación arbitraria)` (`formatting.ts`, `summaryText.ts`) | 5 | Compared with stored artifact text |
| Stable keys | URL mode value `misión` (`state/ui.ts`), enum codes (`cumple`, `priorizado_para_reconocimiento`, purpose IDs, `no_adquirido_en_M8`), `.previo` backup directory names | — | Contract or URL identity |
| Display-map keys | `apps/web/src/i18n/sourceText.ts` (about 300 Spanish keys), `geologyGloss.ts` (47 official names/descriptions) | ~350 | Exact-match keys of the source text being translated |
| Pipeline text written into artifacts | `build_discovery_snapshot` 75, `build_precision_snapshot` 66, `build_geology_context` 50, `build_science_snapshot` 46, `discover_candidates` 12, `geology_coverage` 12, `fetch_visual_context` 11 (including the hashed evalscript), `fetch_basemaps` 9, `geology_contract` 5 (frozen export text), `geology_policy` 2, `constraints`/`scoring`/`build_context_outline` 1 each | 291 literals | Snapshot prose, `decision_reason`, repair diagnostics and manifest notes in protected artifacts; changing them needs a new artifact version |
| Source configuration | `config/*.json` (10 files) | — | Inputs whose prose flows into artifacts |
| Deliberate test inputs | 273 web test literal hits (Spanish briefs and labels for bilingual parsing, artifact strings for the display map, place names, negative safety regexes); 70 Python test literals (fixtures, simulated upstream errors, Spanish source strings) | 343 | They exercise Spanish input, frozen packs and source evidence |
| False positives | 28 comment hits and 5 test titles: English text with proper names (María Elena) or tokens such as `a`/`o` | 33 | Already English |
| Historical and owned docs | `submission/evidence/**`, `README.es.md`, `*_ES.md`, quoted history | — | Evidence, or owned by Codex |

### Limits

- No browser, native PDF, real provider or deployment was used. The workflow change is wording only and was not executed.
- Pipeline diagnostics were changed and tested only through the existing offline tests; no pipeline was run against real sources.
- The test-title translation used a reviewed index-to-English table (`/tmp/analogos-titles/b*.txt`) applied to the exact literals, with no assertion edits in that step. The assertion edits are the diagnostic ones listed above.

## Phase B — human-facing English (Claude, 2026-11-15) — Owner Codex / review

Phase A was accepted by Codex. This phase was implemented on the same working tree, with no commits, pushes, branch changes, subagents, network or browser use, and without reading `.env` or credentials. I left Codex's Markdown translations alone and edited no README or submission document. `outputs/` is untouched.

### What changed

- **UI, accessibility and states.** Every component and helper in `apps/web/src` now shows English:
  - shell, mode tabs, sheet and rail, planner, composer, Reading, metrics, places, globe and map, leaders, boot, geology, visual context, origin/sources/method tabs;
  - loading, error and empty states, aria labels and live announcements;
  - client error messages and the print notices.
- **Language, numbers and examples.**
  - `index.html` has `lang="en"` and an English meta description.
  - Numbers and dates use en-US formatting; coverage keeps the `<0.1%` / `>99.9%` boundaries.
  - The example brief is English, and its quotes are exact substrings. There are no Spanish placeholders or demo prompts.
  - The manual and offline flow is unchanged.
- **Shared UI constants.**
  - `format.ts` and `catalog.ts` (metric labels and scale notes, topic labels, `LIMITS`, `ORDERING_RULE`), `STATUS_DEFINITIONS`, `PURPOSE_LABEL`/`PURPOSE_DEFINITION`/`GEOLOGY_NOTICE`, `formatCoverage`/`formatScaleLabel`/`AVAILABILITY_*` and the wrapper and geology-export metadata constants now resolve to English.
  - Historical records still rebuild with their frozen pack through the record version.
  - The diagnostic and validation errors in `shared/`, `server/` and web loaders are English and name both supported export versions.
  - `GEOLOGY_POLICY` strings stay Spanish because they are compared with the artifact.
- **Dynamic source text.** The new display layer `apps/web/src/i18n/sourceText.ts` holds about 300 exact entries. It covers:
  - candidate warnings, limitations, field checks, evidence claims and criterion explanations, and discovery and literature notes;
  - manifest dataset fields, profile, precedents, search results and analysis summary;
  - visual context, the geology editorial and processing text, basemaps and reference analogs.

  Generated site names keep the place name and get English coordinates. Mixed 1.1.0 scale notes render the quoted source in English. It is applied in Reading, the criteria table, limits, field checks, sources, the origin and method tabs, metrics, places, markers and the printed report. Unknown text is shown unchanged and is never invented (see the Phase B corrections below: no language is inferred).
- **Official geology wording.** `apps/web/src/i18n/geologyGloss.ts` has faithful, term-by-term English glosses for all 22 unit names and 25 descriptions in the active package. Truncations and typos in the source are flagged. In the geology tab, the guidance and the print, a description reads "English editorial translation: …". The official original stays available next to it: a disclosure on screen, inline in print, with `lang="es"`. Unit names show the official name followed by the gloss. Official authorities, distributors, dataset titles and place names are kept verbatim; Spanish bibliographic titles carry `lang="es"` and the label "(original title, Spanish)".
- **AI.**
  - The system prompts, purpose definitions and retry reminder are English (`server/ai/prompts.ts`, `shared/geology/guidance.ts`).
  - The draft prompt requires English activity, labels, details and open questions even for a Spanish brief, and a verbatim `source_quote` in the brief's own language. The server still checks that quote and its literal numbers.
  - The deterministic draft safety net (unmeasured topics, scale and figure questions, warnings) is English.
  - English topic patterns were added (wheel slip, boulders, soft sand, road access, permission, field season, rainfall, cell coverage); the Spanish patterns are kept.
  - Explanations and geology still return IDs only, with one bounded retry; the server error messages are English.
- **Reports.**
  - The printed report is English and carries a language note: source evidence is translated for reading, the JSON keeps the original wording, and user text is shown as written.
  - New mission and geology exports are 1.1.0 / wrapper 2 / geology export v2 (English authored text plus language disclosure).
  - Raw source downloads are labeled "JSON source record": the geology per-site record, the site record and the provenance indexes. The site record notice says the site object keeps its original wording.
  - New download filenames are `analogos-recommendation-*.json` and `analogos-recommendation-geology-*.json`. Stored artifact filenames are unchanged.
- **Documentation.** New `docs/decisions/ADR-016-english-default-and-export-compatibility.md` (status: proposed).

### Tests

- **New:**
  - `src/tests/sourceText.test.ts` (14 tests): coverage of every exposed Spanish string in each active artifact, no orphan geology glosses, the fallback mark, and proof that artifacts, the bundle and audit JSON are not mutated.
  - `src/tests/englishRender.test.tsx` (8 tests): real v3 and geology renders of the result, print with and without geology, diagnostics, the geology tab for every sector, guidance, metrics, places, the Reading for every site, origin/sources/method tabs and the manual editor. Official names and `lang="es"` spans are stripped and the rest must contain no Spanish prose and no fallback marks.
  - `src/tests/aiServer.test.ts` (+4 tests): a Spanish brief and an English brief through the draft, plus an English clarification and the explain operation, all with mocked provider responses (no real provider calls).
- **Updated:** about 300 existing assertions across 43 test files now expect English, with the same meaning. The negative safety regexes ("apto/aprobado/…") gained English equivalents.
- **Legacy:** all legacy and version tests from Phase A pass unchanged (`englishVersioning.test.ts`, Python parity).

### Evidence

- `PATH="$PWD/.venv/bin:$PATH" npm run verify` passes: 335 Python passed; 894 web passed and 3 opt-in skipped; server and web typecheck and the build pass. Log: `/tmp/analogos-english-phase-b-verify.log`.
- `git diff --check` is clean.
- All 77 files in `/tmp/analogos-english-protected.json` match their hashes.

### Remaining Spanish, kept on purpose

- Official names and titles (authorities, distributors, dataset titles, place and unit names) and Spanish bibliographic titles.
- Source records inside JSON exports, user-entered text and stable codes/enums.
- The frozen 1.0.0 / v1 text packs, and `GEOLOGY_POLICY`/`HISTORICAL_GEOLOGY_LIMITATION`, which are compared with artifact text.
- Code comments and test names (Phase C).

### Limits

- I did not use a browser, render a native PDF or call the real provider. These checks are SSR, logic and mocked-provider tests. Codex owns browser, mobile, native PDF and real-AI QA, plus packaging and the release.
- The display map is exact-match: new or changed artifact text needs a new entry, and the coverage test will fail until it has one.

## Phase A — compatibility core (Claude, 2026-11-15) — Owner Codex / review

Base: `dev` at `273e5f8`. No commits, pushes or branch changes. I did not read `.env` or any credentials, used no subagents and made no network requests.

### What changed

New records are English. Historical records still validate and rebuild exactly. The version field already inside each record selects the wording. Logic, thresholds, ordering, IDs and request fingerprints do not depend on it.

| Record | Historical (frozen Spanish) | New default (English) |
|---|---|---|
| Mission evaluation `evaluation_version` | `1.0.0` | `1.1.0` |
| Mission export `export_version` | `1.0.0` (no `language` block) | `1.1.0` + required constant `language` block (source-language disclosure) |
| Geology wrapper `schema_version` | `1` (embeds 1.0.0 + geology exports v1) | `2` (embeds 1.1.0 + geology exports v2) |
| Per-site geology export `schema_version` | `1` | `2` (same content, English `export_info` + language note); package stays `analogos-geology-context` v1 |

- **Text packs:**
  - `shared/mission/text/{types,es,en,index}.ts` covers mission records. `es.ts` is the frozen copy of the former strings and hand-rolled formatters from `format.ts`/`catalog.ts`/`evaluate.ts`/`geometry.ts`/`explanation.ts`/`exportReport.ts`.
  - `shared/geology/text.ts` covers geology records: per-site `export_info`, catalog limits and reference texts, composed guidance, wrapper metadata. Version 1 keeps the legacy `Intl` es-CL formatter verbatim. The English pack keeps full precision and the `<0.1%` / `>99.9%` boundaries.
- **Version selection:**
  - `evaluateMission(request, bundle, { version? })` defaults to `1.1.0`.
  - `buildMissionExport` takes the version from the evaluation.
  - `buildGeologyCatalog` and `composeGeologyGuidance` take it from the evaluation. `GeologyCatalog.evaluation_version` is outside `catalog_fingerprint`; the fingerprint already binds the evaluation.
  - `buildMissionGeologyExport` takes it from the embedded mission export.
  - `buildGeologyExport(context, siteId, version = 2)`.
  - An unknown version throws in every public builder. Nothing falls back to English.
- **Pairing enforced:**
  - **Schema:** `allOf` if/then in the mission export and wrapper contracts.
  - **Semantics:** `exportWrapper.ts` `versionIssues` and wrapper checks require that rules, status definitions, ordering rule, limits, language block, wrapper text, identity text and geology export text all match their version. This applies with or without the bundle.
  - **Per-site exports:** `validateGeologyExport` (TS) and `validate_export` (Python) now require `export_info` wording to match `schema_version`. I checked that every historical file already satisfies this.
- **Format detection:** `detectMissionExportFormat` accepts exactly `mission-export-1.0`, `-1.1`, `mission-geology-export-1` and `-2`.
- **Python:** `pipelines/geology_contract.py` `build_export(index, site_id, schema_version=1)` keeps its legacy default and offers explicit `2`. Stored geology artifacts and their generation are unchanged.
- **UI-facing exports still in Spanish (Phase B):** `fmtNumber`, `describeCondition`, `SCALE_LABEL`, `IMPORTANCE_LABEL`, `LIMITS`, `ORDERING_RULE`, `STATUS_DEFINITIONS`, `PURPOSE_LABEL`, `GEOLOGY_NOTICE`, `formatCoverage`, `formatScaleLabel`, `AVAILABILITY_LABEL` and the `GEOLOGY_EXPORT_*`/`WRAPPER_*` constants. They now re-export the frozen v1/1.0.0 text. The UI shows English *record* text (reasons, notes, limits, guidance) mixed with Spanish chrome until Phase B. That is expected for this checkpoint.
- **Not changed:** AI prompts (`server/ai/prompts.ts`, `PURPOSE_DEFINITION`), UI copy, input-error messages, `catalog.ts` UI labels. These are Phase B.

### Files

- **Source:**
  - `shared/mission/{types,format,catalog,geometry,evaluate,explanation,exportReport}.ts`
  - new `shared/mission/text/*`
  - `shared/geology/{context,guidance,exportWrapper}.ts`
  - new `shared/geology/text.ts`
  - `pipelines/geology_contract.py`
- **Contracts:** `contracts/{mission-evaluation,mission-export,mission-geology-export,geology-export}.schema.json` (version enums, pairing, `language`). Mission schemas are compiled at runtime, so there are no generated validators to refresh.
- **New tests and fixtures:**
  - `apps/web/src/tests/englishVersioning.test.ts` (62 tests)
  - `apps/web/src/tests/legacyCases.ts` (12 representative requests)
  - `tests/fixtures/mission-legacy-1.0.0-hashes.json` (legacy hashes captured **before** any source edit)
  - `tests/fixtures/geology-export-v2-ar-win-s2640-w06730.json` (English golden, generated by Python). The v1 golden was not overwritten.
- **Updated tests (wording only, same semantics):**
  - `apps/web/src/tests/{missionEngine,missionFormat,missionGeometry,geologyGuidance,geologyContext,plannerGeology,plannerUi}.test.*`
  - `apps/web/src/features/analysis/ReadingView.test.tsx`
  - `apps/web/src/features/composer/MissionControllerGeology.test.ts`
  - `tests/test_geology_context.py` (+2 tests)

### Evidence

- **Legacy byte identity:** 12 cases cover unsupported objective, none prioritized, empty requirements, point and bbox without coverage, point needing a window, point and bbox with a chosen AR window, AR6 `ar-win-s2580-w06710` geology, CL partial and the Yungay reference. For each case, the 1.0.0 evaluation, export, catalog fingerprint, guidance, wrapper, verification catalog and explanation view hash to the values captured from `273e5f8` before the edit. All seven per-site v1 exports also hash to their captured values.
- **The 10 historical exports in `submission/evidence/`** (2 × M8 1.0, 6 × wrapper v1, 2 × geology export v1):
  - All validate with and without the trusted bundle.
  - The engine reproduces every stored evaluation with the 1.0.0 pack.
  - Every wrapper rebuilds to identical canonical JSON from its own content plus the trusted context.
  - Both per-site exports equal the rebuilt v1 export.
  - These substantive changes are rejected with and without the bundle: status, rank, observed value, evidence ID, threshold, geology fraction, unit description, foreign selection, geometry, and wrapper wording.
  - These relabelings and unknown versions are rejected too: `1.1.0`, `1.1.0` plus evaluation version plus language block, `1.2.0`, a language block on `1.0.0`, wrapper `2`/`3`, and geology export v2.
- **English vs legacy, all 12 cases:** these are identical between versions:
  - outcome, comparability, recommended IDs, statuses and ranks
  - critical failed/unknown, preferences, observed values and units
  - evidence IDs, datasets and URLs, resolution and geometry, data-request geometry and requirements
  - catalog sites, units, fractions and availability, `ref_id`/purpose sets and deterministic selections
  - verification IDs, and the geology subsets apart from `export_info`
- **English content checks:**
  - Authored strings contain no Spanish wording. The detector is shown to flag every frozen 1.0.0 text.
  - English numbers keep precision: `12,345.5 km²`, `between 0.5 and 1,234.5 m`, `1e-7`, `0.30000000000000004`. Legacy output is unchanged: `12.345,5 km²`, `entre 0,5 y 1234,5 m`.
  - Coverage boundaries hold in both versions.
- **AI records:**
  - An English wrapper with an AI selection validates.
  - An English-bound explanation record is rejected on a legacy evaluation, and a geology AI record is rejected across versions.
  - Mixed exports are rejected: 1.1.0 without language, 1.1.0 with Spanish rules or limits, an edited language note, and mismatched evaluations.
  - Mixed wrappers are rejected: wrapper 2 embedding 1.0.0, wrapper 1 embedding 1.1.0, wrapper 2 with v1 exports, Spanish wrapper/identity/guidance text, and wrapper 1 relabeled as 2.
- **Python:**
  - The v1 golden is unchanged and still equal.
  - The v2 golden matches and differs from v1 only in `export_info`.
  - Mislabeled wording is rejected, and so are versions `0`, `3`, `"2"` and `True`.
- **Full verify:** `PATH="$PWD/.venv/bin:$PATH" npm run verify` passes. Log: `/tmp/analogos-english-phase-a-verify.log`.
  - 335 Python passed (baseline 333).
  - 868 web passed and 3 opt-in skipped (baseline 805).
  - Server typecheck, web typecheck and build pass.
- `git diff --check` is clean on my files.
- **Protected files:** all 77 in `/tmp/analogos-english-protected.json` still match their hashes.

### Reproduce

```
PATH="$PWD/.venv/bin:$PATH" npm run verify
npm -w apps/web run test -- src/tests/englishVersioning.test.ts
.venv/bin/python -m pytest -q tests/test_geology_context.py
```

### Notes for review

- The English `snapshotScaleNote` labels the copied criterion explanation as "Snapshot explanation (original source text, Spanish)".
- The English `unitLabel` quotes official unit names verbatim with “ ”.
- The server's `/api/ai` explain now evaluates as 1.1.0, the same default as the client. A client and server deployed from different commits would produce different evaluation fingerprints; the existing stale-result path covers this.
- **Concurrent working-tree changes that are not mine:** while I worked, tracked docs were edited by someone else between 09:44 and 09:51:
  - `AGENTS.md`, `CLAUDE.md`
  - `docs/**`, `project/{BACKLOG,HANDOFF_PROTOCOL,M8/M9/M10_PROGRESS}.md`, `project/tasks/*`, `prompts/*`
  - `submission/*.md`, plus the new `submission/*_EN.md`
  - `apps/web/src/features/*/README.md`, `tests/fixtures/contracts/README.md`

  I did not create, edit or review any of them, and I did not touch `README.md`, `README.es.md` or `outputs/`. For the same reason I left `project/STATUS.md` and `CHANGELOG.md` for Codex instead of risking a collision.
