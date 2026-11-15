# Integration plan: Explore/Mission redesign on top of origin/dev (M7 and M8)

> **Review closure (2026-11-15):** integration published at `dev` on `dd625b4`, Actions 43678787020 passed. Codex checked the draft and the geological explanation against the real Anthropic API and accepted ADR-013/014. See `docs/CODEX_INTEGRATION_REVIEW.md` and the current STATUS block. The statuses "plan not executed", ADR proposed and push pending that follow describe the historical stages of the plan, not current blockers.

- Date: 2026-11-14
- Working branch: `feature/mision-redesign` (HEAD `9b32457`).
- Target: `origin/dev` (HEAD `92392f1`), which has 14 team commits since the common base `adcffcd`.
- Status: **plan not executed.** The commit that adds this file changes nothing else.
- Authorization: the user asked "merge into dev and push" and decided to integrate. The interface remains the redesign's. Internally, the deterministic engine (`shared/mission`), the Anthropic AI (`server/ai` and its client) and the team's v3 data are used, with its reproducible search.
- Where this plan comes from:
  - reading origin/dev in read-only mode (temporary worktree already removed, `git merge-tree`, `git archive`);
  - tests run in both trees;
  - `docs/UX_REDESIGN.md` and `docs/BUILD_CONTRACTS.md`.

## 0. Summary

1. **The interface is the redesign's:** background globe with automatic switch to 2D, ●◆○ markers, place carousel, Tesla lines, metrics rail, composer, Reading, "Honest orbit" loading and mobile sheet.
2. **Internally, the team's work is used:**
   - `evaluateMission`, the explanation and the exportable JSON of `shared/mission`;
   - the Anthropic AI, which lives only on the server and is called with `apps/web/src/mission/aiClient.ts`;
   - the `science-v3` snapshot with `domain/discovery.ts`.
3. **`features/engine` and the lktron client (NDJSON) are retired,** along with their contracts, validators, the pregenerated analysis and their tests. Only two pieces with no equivalent survive: the visual wait thresholds (`PHASE_THRESHOLDS`, which move to the composer without their own timeout) and the facts layer of `analysis`.
4. **Mission stops computing a "mission %".** It shows:
   - the status, with 4 possible values;
   - the rank, only for prioritized options;
   - the preferences met;
   - v3 similarity, confidence and stability without recalculation;
   - territorial feasibility, always "pending".
5. **The AI is never called on its own.** There are two explicit buttons, each with its own submission notice: "Propose requirements with AI" and "Highlight reasons with AI". Without a key, or from the ZIP, the manual flow works in full.
6. **Pampa Yungay is REF:** it stays out of the Explore ranking and carries its label on the globe, the carousel, the rail and Compare.
7. **ADR:** our 008–010 become 010–012 and ADR-013 is added for the integration.
8. **Tests:**
   - the team's tests are kept without touching their assertions;
   - those of our own engine and of lktron are deleted;
   - those of the features are rewritten against v3 and `MissionEvaluation`.
9. **Work order:** F0 baseline → F1 merge → F2 data, contracts and build → F3 Explore v3 → F4 Mission → F5 Reading → F6 retirements, ADR and documentation → F7 verification and push (§8).

## 1. Invariants

| Rule | How it is verified |
|---|---|
| The AI produces no figures and does no ranking | All figures in the Reading come from `MissionEvaluation` via `shared/mission/format.ts`. `checkSelection` rejects foreign IDs. Covered by the untouched `aiServer` and `missionEngine` tests and a new adapter test (§7.6) |
| Similarity, confidence and feasibility kept separate | `snapshot_scores` is shown as is and no component combines them. Feasibility always says "pending" |
| Nothing invented | There is no text→thresholds conversion without AI. Template requirements come without a value. The ◆ remain "to be computed" |
| Offline first | The ZIP opened from `file://` and without a network offers Explore, manual Mission and the JSON export |
| No secrets | `ANTHROPIC_*` and `ANALOGOS_AI_*` exist only in the server environment, never with the `VITE_` prefix |
| Do not change formulas, weights or v1/v2/v3 artifacts | `git diff --quiet origin/dev -- <lista de §9.3>` |
| Strict TypeScript | `tsc --noEmit` (web) and `npm run typecheck:server` |
| No new npm dependencies | Today `package.json` (root and web) and `package-lock.json` are already identical in both branches, and must remain so |
| `shared/` and `server/` import nothing from `apps/web` | `grep -rn "apps/web" shared server api` empty and `scripts/check-vercel-function.mjs` green (ERR_REQUIRE_ESM) |
| Do not touch dev/main locally; a single push at the end | `git push origin HEAD:dev` from the working branch, without `--force` |

## 2. Piece-by-piece mapping

What each decision means:
- **Keep:** the piece comes in with no behavior changes.
- **Adapt:** it is kept, with the indicated changes.
- **Adopt:** the team's version is taken.
- **Retire:** it is deleted.

### 2.1 Data, contracts and validation

| Our piece | Team's piece | Decision | Reason and how |
|---|---|---|---|
| `data/loadDemoSnapshot.ts` (v2, `chileOutline`) | The same one in dev: v3, with `outline`, `search`, `precedents`, `SNAPSHOT_PATH` and `IS_DISCOVERY_SNAPSHOT` | Adopt | It is the v3 loading boundary. `chileOutline`→`outline` must be renamed in `AppShell`, `appData`, `features/globe/{MapStage,CandidateGlobe,CandidateFlatMap,CandidateMap}` and in the `testSupport` of metrics, places, leaders, composer and analysis |
| `domain/contracts.ts` (precompiled validators, `CRITERION_IDS`, `isCriterionId`, `ReferenceAnalog`, `errorSummary`) | `shared/domain/contracts.ts` (Ajv at runtime); in dev, the web only re-exports it | Adapt ours | The precompiled validators are kept in the main chunk. From `shared/domain/contracts` **only types** are re-exported (`export type`). `assertSnapshotContracts` and `assertDiscoveryContracts` are implemented with the generated validators and with the same messages as dev ("Invalid candidate N", "Invalid search results", "Invalid precedent catalog"). `shared/domain/contracts.ts` is not touched because `server/ai/facts.ts` uses it |
| `apps/web/scripts/build-validators.mjs` | — | Adapt | `validateSearch` (discovery-search) and `validatePrecedents` (precedent-catalog) must be added to `validators.discovery.generated.js`, which is a separate chunk; if they go into the main one it grows by about 17 KB gz. `validators.interpretation.*` and `validators.mission.*` must be removed. Then it is regenerated with `npm -w apps/web run validators`, because the build's `--check` fails if the `candidate-site` schema changed |
| `contracts/{mission-interpretation,evidence-packet,ai-analysis}.schema.json` | `contracts/mission-{request,evaluation,export,ai}.schema.json` | Retire ours | They are replaced by the M8 contracts (the team's ADR-009). They are deleted along with their fixtures in `tests/fixtures/contracts`, the generated validators and the tests |
| `contracts/reference-analog.schema.json` and `config/reference_analogs.json` (◆) | There is no equivalent; `precedents.json` is something else | Keep | It is the world catalog of "to be computed" analogues. It is not mixed with `precedents.json`, which is the bibliography of the pilot region |
| `domain/scoring.ts` `rankCandidates(todos)` | `domain/discovery.ts` (`splitByRole`, `filterByCountry`, `availableCountries`, `initialSelection`, `summarizeSearch`, `matchDetails`, `buildExport` and labels) | Adopt discovery and adapt the usages | `rankCandidates` is applied only to `splitByRole(...).ranked`. There are 8 calls that change: `places/placeModel.ts`, `globe/markers.ts`, `globe/CandidateMap.tsx`, `metrics/metricContext.ts`, `analysis/runtime.ts`, `analysis/evidencePacket.ts`, `composer/model.ts` and `composer/missionRun.ts` |
| `data/loadVisualContext.ts` | The dev version, with `VISUAL_CONTEXT_DIR` | Adopt | It comes in without conflict |
| `features/boot/loadingHints.ts` (v2 preload) | — | Adapt | It switches to preloading v3 (§4.4). `snapshotCredit` reads the v3 manifest |
| `artifacts/basemaps/*` (WebP from the redesign) | Same | Keep | They are background images, not scientific artifacts. The WebP previews match by SHA only for Yungay; the other 6 sites load the v3 PNG |
| `artifacts/analysis/ai-analysis.default.json` and `scripts/make_pregenerated_analysis.py` | — | Retire | It is pregenerated prose, tied to the v2 package fingerprint. With v3 it never matches, and showing it as AI would attribute a template to the AI (the team's ADR-009 §9) |
| `artifacts/{demo,science-v1,science-v2,visual-context}` | Identical | Keep | `test_discovery.py` and `snapshot.test.ts` read them. `prune-build` takes them out of dist |

### 2.2 Engine and evaluation

| Our piece | Team's piece | Decision | Reason and how |
|---|---|---|---|
| `features/engine/scoreMission.ts` (`scoreMission`, `buildMissionInputs`, `limitingCriterion`, `isUsableBase`) | `shared/mission/evaluate.ts` (`evaluateMission`) | Retire; the team's is used | The team's ADR-009, already accepted, forbids changing weights. Its order is: must-haves → preferences met → v3 similarity → `site_id`. If both engines remained active, the screen would show two orderings and two "similarities" |
| `profiles.ts` (`levelsToWeights`, `profileFromLevels`, `MISSION_PRESETS`, `fnv1a32`) | `Requirement[]`, `exampleState`, `EXAMPLE_BRIEF`, `defaultMetricRequirement`, `fingerprint` | Retire | Reweighting is changing weights |
| `demoMatcher.ts` (`matchMissionDemo`, `DEMO_LABEL`) | `detectUnmeasuredMentions`, `uncoveredMentions`, the editable example and manual editing | Retire | Extracting thresholds from keywords invents figures. No substitute is created |
| `aggregate.ts`, `pyMath.ts` (port of `scoring.py`) | — | Retire | No one uses them once the recalculation is removed. The baseline robustness is read from `analysis-summary.sites[].sensitivity`, which the pipeline already writes |
| `missionPhase.ts`: `PHASE_THRESHOLDS`, `PhaseThresholds`, `WaitStage` | `CLIENT_TIMEOUT_MS` = 45 s in aiClient | Adapt: they move to `features/composer/labels.ts` | Only the visual thresholds remain: counter at 3 s and slowness notice at 10 s. `timeoutMs` = 20 s is **removed**. The cutoff is done by aiClient at 45 s, or by the user with "Cancel" (AbortSignal), and the label says "cancelled", not "AI failed" |
| `nextMissionPhase`, `createMissionRunController`, `waitStage` | `plannerReducer` and `usePlanner` | Remove | The team's reducer already guards against late responses with `requestId` and the fingerprints of the brief, request, and evaluation |
| `state/mission.ts` (`lktron`/`demo`/`preset`, interpretation, profile, scoring) | `PlannerState` | Adapt, using the new shape from §3.1 | |
| — | `shared/mission/*`, the re-exports of `apps/web/src/mission/*`, `plannerState.ts` and `siteMeasures.ts` | Keep intact | This is verified work and the server depends on `shared/` |

### 2.3 AI

| Our piece | Team piece | Decision | Reason and how |
|---|---|---|---|
| `analysis/lktron.ts`, `lktronConfig.ts` (`VITE_LKTRON_URL`), `lktronClient.ts`, `ndjson.ts` | `apps/web/src/mission/aiClient.ts` (`requestDraft`, `requestExplanation`), which does `POST ${BASE_URL}api/ai` | Remove; aiClient is used | With aiClient the secret stays on the server, the call goes to the same origin, there is a cap of 45 s, it is cancelled with AbortSignal, and responses are validated |
| `eventGate.ts`, `analysisTokens.ts`, `TokenText.tsx`, `factIds.ts` | `checkSelection`, `composeExplanation`, `deterministicSelection` | Remove | The team's AI does not write prose with `{{id}}`: it only chooses existing IDs |
| `fnv.ts` (package fingerprint) | `fingerprint.ts` (pure SHA-256) | Remove | |
| `pregenerated.ts` | `deterministicSelection`, labeled "Deterministic template without AI" | Remove | |
| `evidencePacket.ts` (package and fact layer) | — | Adapt: only the fact layer remains (`features/analysis/facts.ts`) | These deterministic facts have no equivalent: direction relative to Jezero, limiting factor, saturating criterion, shared regional value, criterion without discrimination, best of N, missing data, and checks. `SITE_ID=/^cl-/` must be removed (it leaves out the Argentine 3) and the REF must be treated as a separate fact. The package and its fingerprint disappear |
| `robustness.ts` | — | Adapt | Now reads `analysis-summary.sites[].sensitivity`, with a parser in `domain/` similar to `parseMarsReference`, instead of `engine.sensitivity` |
| `readingStore`, `controller`, `ReadingPanel`, `ReadingPill`, `ReadingSnippet`, `ReadingView`, the skeleton | — | Adapt | They remain the surface of the Reading, now fed by `ExplanationView` (§5) |
| — | `server/ai/*`, `api/ai.ts`, `tsconfig.server.json`, `scripts/check-vercel-function.mjs`, `.github/workflows/vercel-deploy.yml` | Keep intact | Deployment and function verified by the team |
| `apps/web/vite.config.ts` (`loadingHints`, `codeSplitting` from rolldown) | The `aiDevApi` plugin (`/api/ai` in `vite dev` and `vite preview`, `loadEnv` filtered by `ANTHROPIC_`/`ANALOGOS_AI_`) | Merge both | Without `aiDevApi`, the local AI always appears as unavailable |

### 2.4 Redesign features

| Feature | What is kept | What is adapted | What is removed |
|---|---|---|---|
| `places` | The ◆ catalog (`analogCatalog`, `referenceAnalogs`, `ReferenceCard`) and `classify`, which adds the "matches" badge when a ◆ falls inside a polygon | `buildPlaceModel` and `PlaceRail`:<br>• Explore uses `ranked` with its global rank, then the REF, then the ◆, and has a country filter.<br>• Mission groups by the state of `MissionEvaluation` (§4).<br>• `PlaceModelInput.scoring` → `evaluation`, plus `country`.<br>• `EvaluatedPlace` adds `role`, `country`, `optionStatus`, `preferences` and `inScope` | The labels "% of the deterministic engine vX". Also the dev `components/CandidateRanking.tsx`: it was never part of our UI and its assertions move to the `PlaceRail` tests (§7.4) |
| `globe` | Flight, keyboard, geometry, camera, `stageBridge`, the switch from 3D to 2D, and the SVG when there is no WebGL | Markers:<br>• rank from `splitByRole`/`rankOf` and "REF" instead of a number;<br>• group by `candidate.country`;<br>• `outline` CL+AR;<br>• framing that includes both regions;<br>• `contextLayers` according to `snapshot_version`;<br>• in Mission, marker type according to `OptionStatus`.<br>`features/globe/CandidateMap.tsx` takes the content from dev (50 windows, background, `mapFrame`, `projector`) with `../../` routes.<br>The dev changes in `components/{CandidateGlobe,CandidateFlatMap,MapStage}.tsx` must be ported to `features/globe/*` | `MissionScoring` and `scoreSource: 'mission'` |
| `metrics` | `MetricRail`, `MetricViz`, `FadeNumber`, S1 | Weights and contributions **always** come from the snapshot. In Mission, a requirements layer is overlaid (§4.2). `engineVersion` → `rulesVersion` (`RULES_VERSION`). `MetricView.requirements?: RequirementResult[]` | The `kind: 'mission'` context with mission weights |
| `leaders` | `layoutLeaders`, `projector`, `LeaderToggle`, `controller` and the rule of not drawing with a ◆ selected | `pickPrincipalMetrics`: in Mission, first the criteria with a requirement (must-haves before preferences) and then the base weight. The label carries ✓/✕/○ and the text from `describeCondition`. There are no lines for out-of-scope sites | Sort by mission weights |
| `boot` | `BootLayer`, `OrbitLoader`, `StatusChip`, milestones | Preload v3, chip and announcement texts, orbit centered on the two regions (§4.4). `OrbitLoader` is reused for the waits of the draft and the explanation | Preload v2 |
| `composer` | `Composer`, `MissionCard`, `focusComposer` (no signature change), the brief highlights, Undo, and the history | It becomes a layer on top of the team's planner (§3). `missionRun.ts` uses `MissionController`. `history.ts` moves to the v2 format (§3.7). The "Refine" chips change (§3.4) | `MISSION_PRESETS`, levels and weights, the card "7 criteria with levels", "DEMO · no AI", and the automatic submission to the AI when pressing "Send" |
| `analysis` | The fact layer, robustness, and the surface of the Reading | §5 | lktron, NDJSON, eventGate, tokens, FNV, and the pre-generated text |
| `components/planner/*` (team) | `RequirementEditor`, `ScopePicker`, `ConfirmSummary`, `ResultView` (with `CriteriaTable`, `AiPanel`, `PrintReport`), `GeometryFigure`, `planner.css`, `usePlanner` | Reused **as internal pieces** of "Your mission", with the redesign's tokens. `PlannerPanel` is split into `PlannerPanel`, which keeps calling `usePlanner` and keeps its signature for the tests, and `PlannerView`, which is presentational and receives the shared planner. `ResultView` accepts an optional prop `compact` (without it, it behaves the same) | — |

### 2.5 Shell, state, and dev components in conflict

| Path | Decision | How |
|---|---|---|
| `apps/web/src/App.tsx` | Ours | Keeps the loading and `AppShell`. It must literally contain "Prioritizes which sectors deserve reconnaissance for a rover trial" and "It does not measure traction or approve terrain" (`missionFormat.test.tsx` reads them), as a `PRODUCT_PROMISE` constant that is passed to the shell and shown in the initial Explore state and in the Mission header. No hero, no `#planner`, and without the phrase "better reproduces conditions" |
| `content/shell.ts`, `AppShell` | Adapt | The brand changes from "AnalogOS Chile" to "AnalogOS", with the subtitle "Chile–Argentina Pilot". No surface says "M8" |
| `shell/detail/FullDetail.tsx` | Adapt | New tab "Origin", with dev's "Origin and background" block in `shell/detail/OriginSection.tsx` and literal texts. In the header: country, role (REF), "Export sheet (JSON)" with `buildExport(candidate, search)` and "Evaluate this sector". "Compare" stops reading `scoring.engineVersion` |
| `shell/detail/MethodTab.tsx` | Adapt | New section "How they were searched": `summarizeSearch` (2 regions; 50 windows attempted and 50 evaluated; about 22.274 km²; 4 excluded by background; 6 preselected; up to 3 per country; at least 25 km between centers), the list of regions, the SVG `CandidateMap` with the 50 windows, and links to `search-results.json` and `analysis-summary.json` |
| `components/CandidateComparison.tsx` | Manual merge | Dev's signature (`ranked`, `references`, `rankOf`), REF separate, and our style |
| `components/CandidateDetails.tsx` (modified in dev, deleted here) | Remove | The sheet is `FullDetail`, plus the rail. Dev's blocks are distributed: "Origin and background" goes to `OriginSection`, the export and "Evaluate this sector" go to the `FullDetail` header, and "Where it fails", "What to verify", and "Evidence" already exist in the Metrics and Sources tabs |
| `breakdown/ScoreBreakdown.tsx` (modified in dev, deleted here) | Remove | The metrics rail replaces it. Dev's only change, "Chilean sector"→"Terrestrial sector", is carried over to the legend of `MetricViz` |
| `components/LiquidNav.tsx` (modified in dev, deleted here) | Remove | `ModeTabs` replaces it. Dev's `planner` icon is not needed: Mission is already a tab |
| `components/{CandidateGlobe,CandidateFlatMap,MapStage}.tsx` (modified in dev, deleted here) | Remove | Their changes (REF, country, `outline`, `VISUAL_CONTEXT_DIR`) are ported to `features/globe/*` |
| `state/ui.ts` | Adapt | `MissionPhase`: `profile` → `review`, which does not count as busy. `isMissionBusy` = `interpreting`, `scoring` or `analysis`. Yungay REF is selected with `kind: 'evaluated'`; `kind: 'reference'` remains for the ◆ |

### 2.6 Build, packaging, and deployment

| Path | Decision | How |
|---|---|---|
| `package.json` (root) | Adopt dev | Brings `typecheck:server`, `test:ai-live`, `discovery:*` and the `verify` with `typecheck:server`. Today it comes in without conflict |
| `apps/web/package.json` | Ours | Keeps `validators` and the `build` with `build-validators --check`. The dependencies are identical in both branches |
| `apps/web/vite.config.ts` | Union | `aiDevApi` (from dev) plus `loadingHints` and the `$initial` grouping (ours) |
| `apps/web/scripts/prune-build.mjs` | Adopt dev | Only v3 and `visual-context-v3` reach dist. It must be checked that `basemaps/` is kept |
| `vercel.json` | Adopt dev | `git.deploymentEnabled: false` and cache headers for v3 |
| `.github/workflows/vercel-deploy.yml`, `scripts/check-vercel-function.mjs` | Keep intact | Out of scope |
| `scripts/package_release.py` | Manual merge | Dev's base: `SCIENCE_FILES` v3, `visual_images()`, snapshot version control, `DEFAULT_ZIP = submission/analogos-static.zip`. Ours is added to it: `BASEMAP_FILES` (`s2-*.webp`, `world.webp`), the `./data` preload, the `data:` favicon, and the WebP poster. `DATA_REFERENCES` is computed with the v3 lists. **`ANALYSIS_FILES` is removed.** It must never write `analogos-chile-static.zip`, which is the v2 history |
| `submission/analogos-static.zip` and `.sha256` | Regenerated in F7 | Today they correspond to dev's UI (`9060970`, SHA `eacf5dce…`). After integration they are regenerated with `npm run release:package` (twice, same SHA) and the previous and new SHA are recorded in STATUS |

## 3. Planner flows in Explore, Mission, and the composer

### 3.1 A single shared planner

- `features/composer/MissionController.tsx` is mounted once, at the root of the shell and lazily (§3.8). It calls the team's `usePlanner(bundle)`, with `bundle = {candidates, manifest, profile}` from `science-v3` **untransformed**.
- The result is published in `missionStore` (`state/mission.ts`):

```ts
interface MissionState {
  planner: PlannerState                  // the team reducer, unchanged
  request: MissionRequest | null         // built.request, if valid
  evaluation: MissionEvaluation | null   // planner.result
  explanation: ExplanationView | null    // derived (§5.2)
  source: 'anthropic' | 'manual' | 'example' | null
  revision: number                       // +1 on each accepted evaluation
}
```

- Only `MissionController` writes to the store. It exposes `dispatch`, `evaluate`, `runDraft`, `runExplain` and `exportJson` as actions.
- places, globe, metrics, leaders and analysis only read `evaluation` and `explanation`.
- `PlannerView` (§2.4) receives this same instance, so there is no second state.

| Planner step (dev) | UI phase (`state/ui.ts`) | Redesign surface | Busy? |
|---|---|---|---|
| No brief | `idle` | Explore; empty dock | no |
| AI draft in progress (`draft_start`) | `interpreting` | Dock with `OrbitLoader` "Proposing requirements…" and a "Cancel" button | only the composer |
| Describe and scope (edit requirements and geometry) | `review` (new) | "Your mission": `RequirementEditor` and `ScopePicker` | no |
| Confirm | `review` | "Your mission": `ConfirmSummary` ("Confirm requirements and sector" and then "Evaluate now", the team's buttons) | no |
| `evaluated` (synchronous) | `scoring` → `done` | Carousel, globe, rail, lines, and Reading; preview of `recommended_site_ids[0]` if it exists; a single `announce()` | transient |
| AI explanation in progress | `analysis` | Reading with `OrbitLoader`; the rest can be used | only the Reading |
| Editing after the result | `review` | The reducer invalidates and aborts; results move to `--o-busy` until re-evaluation | no |
| Error or cancellation | `error` / `cancelled` | Message on the surface that originated it | no |

### 3.2 "Define a trial" (flow `test`)

1. **Inputs:**
   - the user types in the dock;
   - clicks "Define a test" in the initial Explore state;
   - or switches to the Mission tab.

   In all three cases `dispatch({type:'set_journey', journey:'test'})` is executed.
2. **The brief:**
   - It accepts up to 3000 characters (`MAX_BRIEF_CHARS`; previously 600).
   - Clicking "Submit", or pressing Enter, **does not call the AI**: it opens "Your mission" at the requirements step, with the brief already loaded.
   - Below the brief, the mentions detected by `detectUnmeasuredMentions` are highlighted, along with its "pending items detected" notice.
3. **Requirements:**
   - They are edited by hand, "Use example" (`exampleState`) is loaded, or "✦ Propose requirements with AI" is clicked.
   - Next to that button appears, verbatim, the team's notice: "When you click it, the text of your test is sent to Anthropic to propose a draft. The manual path sends nothing. The AI does not confirm or evaluate…".
   - The draft arrives with `confirmed=false` and with the AI/You label on each requirement.
   - The `source_quote` are highlighted in the brief.
4. **Scope:** the catalog (the 7 windows), a sector, a point or a bbox, with `ScopePicker` and `GeometryFigure`.
5. **Confirm and evaluate:** with the team's buttons. **It is never confirmed automatically after the AI.**
6. **Result on the stage:** it is presented according to §4.2. "Your mission" keeps the compact `ResultView`: headline, visible blockers, ordering rule, "Download JSON" (`analogos-recomendacion-<fp8>.json`), "Print report" and "Back to editing".

### 3.3 "Evaluate a sector" (`sector` path)

- **Inputs:**
  - "Evaluate this sector" in the header of `FullDetail`, in the rail or on the carousel card;
  - in Mission, the marker's context menu.

  All of them do `dispatch({type:'set_journey', journey:'sector', siteId})` and switch the mode to Mission. The scope is fixed to that window and the requirements step opens. Nothing that the reducer keeps or resets is reimplemented.
- **"Evaluate a sector…" without a site:** opens `ScopePicker` with sector, point or bbox. The catalog exists only in the `test` path, as in dev.
- **Point or bbox:**
  - `resolveScope` shows the resolution.
  - A point inside a window yields `needs_window_selection`, and "Evaluate the entire window" must be clicked explicitly (`windowSiteId`).
  - A partial bbox yields `partial_coverage`.
  - Outside any window yields `insufficient_coverage`, with no neighbor. The carousel shows the diagnosis and the export of `data_request`.
- **Optional (P2):** with `ScopePicker` in point or bbox mode, a click on the 2D map fills in lon/lat as text. It does not inherit metrics.

### 3.4 Composer (dock) and "Your mission"

| Current element | Integrated element |
|---|---|
| Brief of 600 characters → lktron or `matchMissionDemo` → levels → `scoreMission` | Brief of up to 3000 characters → (optional) `requestDraft` → editable unconfirmed requirements → explicit confirmation → local `evaluateMission` |
| "Your mission" card: 7 criteria with levels and weights | Requirements (`describeEditable`, `topicLabel`, `RequirementEditor`), scope and `ConfirmSummary` |
| "Refine" chips (`MISSION_PRESETS`) | "Use example", "Add requirement: slope / roughness / relief / bare soil / area / country" (`defaultMetricRequirement`, **no value**) and "Evaluate a sector…" |
| "DEMO" highlights | `source_quote` of the AI draft and matches from `detectUnmeasuredMentions` (`highlightSegments` is reused) |
| Result line "#1 … %" | "N prioritized · #1 ‹name› (REF if applicable) · v3 similarity X (not recalculated)", or "No option prioritized" when `none_prioritized` |
| `announce()` | Only once per `revision`, with the same text |

### 3.5 Without AI and in the ZIP

- The AI button is always visible: its availability is decided by the server.
- If there is no key, if there is 404 or HTML (ZIP), a network error, or the 45 s limit is reached, aiClient returns `unavailable` with "AI not available… You can continue manually". The text is shown next to the button and the path continues.
- The word "DEMO" is never used.
- The Reading shows the deterministic template, labeled (§5).
- The JSON export works and carries `ai.draft` and `ai.explanation` in `null`.

### 3.6 What the user is asked to accept

Without AI there is no deterministic conversion of free text into thresholds, and creating one would break the "nothing invented" rule. For that reason the "I type and see results" flow becomes "I type, add requirements or use the example, confirm and evaluate". This must be recorded in ADR-013 and in STATUS.

### 3.7 Invalidation, late responses and history

- **Invalidation:** any edit to the brief, requirements or scope causes the reducer to invalidate the confirmation and the result. `MissionController` aborts the current request at the network level with a `AbortController` per `requestId` (effect ported from `usePlanner`).
- **History** (`analogos.composer.history.v2`):
  - It saves the brief, scope and requirements with `origin: 'user'`.
  - Requirements with `origin: 'ai'` that nobody edited **are not saved**.
  - The AI provenance and the results are also never saved.
  - It is restored with a sequence of existing actions (`reset` → `set_journey` → `set_brief` → `add_requirement`×n → `set_scope`), without creating a new action in the reducer.
  - The v1 key is ignored: its level format is incompatible.
- **Undo:** uses the same format.

### 3.8 Deferred loading

- `shared/mission/validate.ts` and `aiClient.ts` compile Ajv on import. Therefore **everything that imports `apps/web/src/mission/index.ts`, `validate`, `evaluate`, `exportReport`, `plannerState`, `aiClient` or `components/planner/*` goes in the deferred mission chunk.** It is loaded on entering Mission, on clicking "Evaluate this sector" or on focusing the dock.
- Explore and the rail may only import the modules without Ajv: `mission/format`, `mission/catalog`, `mission/siteMeasures`, `mission/types` and `mission/fingerprint`.
- This is verified in F7: the entry chunk does not contain `ajv`.

## 4. How v3 is presented

### 4.1 Explore

| Surface | Presentation |
|---|---|
| Globe / 2D | • 6 numbered ● 1–6 with their global rank (`rankOf`).<br>• Yungay: ● labeled "REF" with a reference outline, **never a number**.<br>• The 8 ◆ of the world catalog remain "to be calculated". `atacama-yungay` coincides with the REF polygon and appears as a badge "coincides with Pampa Yungay (REF)", not as an overlapping ◆.<br>• Grouping by `candidate.country` (`countryLabels`).<br>• `context-outline.geojson` outline (CL and AR) with the label "Reference outline, not an official boundary".<br>• The initial framing and the 2D view cover the interior of Antofagasta and the Puna of Catamarca and Salta. |
| Carousel | • First the 6 cards in global order; then the REF card ("REF · Known reference · Not part of the search"); finally the ◆.<br>• "All / Chile / Argentina" chips (`availableCountries`, `filterByCountry`) with `aria-label="Filter candidates by country"`. Filtering **preserves the global rank**.<br>• The "of N" counter counts only the candidates.<br>• Empty state: "The search left no candidates in ‹country›" and "Known reference: Yungay".<br>• v3 similarity with decimal 1 and confidence separately. The country is given in text, without flags. |
| Rail | • Weights and contributions from the snapshot.<br>• Header with country, role (REF), "Territorial feasibility: pending" and a link to "Origin".<br>• "Best of N" counts only the 6 candidates, with a note saying that the REF is left out.<br>• Shared regional values, labeled as they are today. |
| Tesla lines | Same as today, with the base weights. |
| Sheet (`FullDetail`) | • "Origin" tab: origin, `window_id`, `selection_rank`, the topographic priority with its note ("it only orders the shortlist; it is neither the score nor the confidence"), the bibliographic review (`note`, `catalog_version`, `reviewed_at`) and `matchDetails` with its source.<br>• For the REF: "Known reference", "Not part of the search" and "The window contains published sampling coordinates".<br>• "Export sheet (JSON)" button, which uses `buildExport`.<br>• The territorial authorities come from the site itself (IDERA or IDE Chile, depending on the country), with no fixed texts. |
| Method | "How they were searched" (§2.5). The `precedents.json` background is bibliography: only the Navarro-González transect (30 points) is drawn, in the SVG; the rest are toponyms without coordinates and are never drawn as pins. |
| Compare | `CandidateComparison` with `ranked`, `references` and `rankOf`, and the REF separately. |

### 4.2 Mission (after evaluation)

| Surface | Presentation |
|---|---|
| Carousel | • Groups in the team's status order.<br>• **Prioritized for reconnaissance:** "#rank" from `option.rank`; if it is Yungay, "#n · REF".<br>• **Insufficient evidence:** ○.<br>• **Does not meet requirements:** dimmed, with "what prevents it" (`critical_failed`).<br>• **Unsupported target.**<br>• **Out of scope:** sites that are not in `evaluated_site_ids`, in a collapsed, neutral group.<br>• Each card shows the status (`STATUS_DEFINITIONS`), "met/total preferences", "v3 similarity X (not recalculated)", the confidence and "Territorial feasibility: pending".<br>• When `outcome` is `needs_window_selection`, `insufficient_coverage` or `unsupported_target`, the carousel shows the diagnostic card (with exportable `data_request`) instead of an empty list. |
| Globe | • Prioritized: ● with "#rank".<br>• Insufficient evidence: ○.<br>• Does not meet: dimmed ● with ✕.<br>• Out of scope: neutral and dashed.<br>• The REF keeps its label.<br>• **There is no %:** the marker encodes status or role, never suitability. |
| Rail | Requirements layer over each criterion, via `METRICS[metric_id].source.criterion_id`:<br>• `median_slope_degree`→`slope`<br>• `terrain_roughness_meter`→`terrain_roughness`<br>• `local_relief_meter`→`local_relief`<br>• `nonvegetated_fraction`→`bare_ground_fraction`<br><br>Each row shows:<br>• what is required (`describeCondition`);<br>• what is observed (`fmtObserved`);<br>• ✓/✕/○;<br>• `reason`, `scale_note`, `period`, `conversion` and `evidence_ids` (linked to Sources).<br><br>Area and country are site rows (`siteMeasures`). Unmeasured topics appear as "pending · not measured". The weights are those of the snapshot. |
| Tesla lines | Criteria with a requirement (essential ones first), with ✓/✕/○ and the text of `describeCondition`, the same as in the exported JSON. No lines for out-of-scope sites. |
| "Your mission" / sheet | Compact `ResultView` (headline, ordering rule, blocks, `pending_requirements`, `open_questions`, `limits`), "Download JSON", "Print report" (`PrintReport` mounted while there is a result) and "Back to editing". |

### 4.3 Mobile sheet

- **S0 (Explore):** carousel, with its country filter.
- **S1 (Mission results):** status groups and rail with the requirements layer.
- **S2 (detail card):** `FullDetail`, with the Origin and Method tabs.
- The sheet's "Mission" tab hosts `PlannerView`.
- Export and print remain within reach on mobile: the sheet never unmounts them while there is a result.

### 4.4 Startup and credits

| Element | Value |
|---|---|
| Default snapshot | `VITE_SNAPSHOT_PATH ?? 'science-v3'` (`SNAPSHOT_PATH` is imported) |
| Preload | `candidate-details.json`, `manifest.json`, `mission-profile.json`, `context-outline.geojson`, `analysis-summary.json`, `search-results.json`, `precedents.json`, `visual-context-v3/index.json` and `basemaps/basemaps.json` |
| Chip | "Snapshot v3 · 6 candidates · 1 REF · N ◆ to be calculated" |
| Announcement | "6 candidates and 1 known reference" |
| Orbit | Centered on the two regions |
| Credit | From the v3 manifest (22 datasets) |

## 5. The Reading with the team's real AI

### 5.1 What the team's AI does and does not do

- The `explain` operation receives the confirmed `MissionRequest` and its fingerprint. The server recalculates `evaluateMission` with the bundled `artifacts/science-v3` and sends only compact facts to Anthropic. The model returns **a selection of IDs**: key requirements and evidence per option, and the order of the verifications.
- It writes no prose or figures.
- The client accepts the selection only if `request_fingerprint` and `evaluation_fingerprint` match the local evaluation and if `checkSelection` passes.

### 5.2 Reading model in Mission (three layers, always kept separate)

| Layer | Source | Label |
|---|---|---|
| 1. Result | `MissionEvaluation`: `ordering_rule`, groups, `requirement_results[].reason`, `what_would_change`, `pending_requirements`, `open_questions`, `limits`, and `data_request` when `outcome` is not `evaluated` | "Deterministic calculation · mission-rules-1.0.0 rules · v3 similarity not recalculated" |
| 2. Highlighted reasons | By default, `composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')`. After the AI, `composeExplanation(evaluation, selection, 'anthropic')` | Template: "Deterministic template without AI", without ✦. AI: "✦ Reasons highlighted with AI (Anthropic) · the figures come from the deterministic calculation", with the provenance (model, `created_at`, `request_id`) |
| 3. Snapshot facts | The facts layer of `analysis` (§2.3) over the evaluated sites | "Snapshot facts" |

- The ✦ gloss appears only when `explanation.source === 'anthropic'`.
- The field verification checklist follows `selection.verification_ids`, which replaces `field_priority`.

### 5.3 Required adapters (pure functions, with tests)

| Adapter | Signature | Function |
|---|---|---|
| `explanationToReading` | `(view: ExplanationView, evaluation: MissionEvaluation) → ReadingModel` | Converts the team's view into the sections of `ReadingPanel`, `ReadingPill` and `ReadingSnippet`. The lines use `describeRequirementLine`, `fmtObserved` and `fmtQuantity`. **It never reads numbers from the selection:** only IDs, which it resolves against `evaluation` |
| `readingKey` | `(evaluation, revision) → string` | `mission:${request_fingerprint}:${revision}` for `readingStore`. A different key discards the previous Reading |
| `snippetFor` | `(view, siteId) → string \| null` | First key requirement of the site, for the pill on the carousel card |
| `evidenceHref` | `(evidenceId, evaluation) → {tab: 'fuentes', anchor} \| {url}` | Links `evidence_ids` with the Sources tab (artifact) or with `#site-record` (`app_derived`) |
| `buildFactsLayer` | `(snapshot, rankedIds, referenceIds) → Fact[]` | What remains of `buildEvidencePacket`: no package, no FNV fingerprint and no `^cl-` filter |
| `parseSensitivity` | `(analysisSummary) → Map<siteId, Sensitivity>` | Input of `robustness.ts`, taken from the pipeline |
| `requestMissionExplanation` | Controller `runExplain` wrapper | The Reading does not call aiClient directly. Everything goes through the reducer, which keeps the safeguards |

### 5.4 States and texts

| State | Behavior |
|---|---|
| Initial (`done`) | Layers 1, 2 (template) and 3, and the button "✦ Highlight reasons with AI". Next to the button goes the literal notice from `ResultView`: "Pressing the button sends the confirmed requirements and the results already calculated to Anthropic (not the full text of the brief)." The button **only exists when `outcome === 'evaluated'`** |
| In progress (`analysis`) | `OrbitLoader` "Highlighting reasons…": counter at 3 s, slowness notice at 10 s, "Cancel". The template remains visible |
| Unavailable | aiClient message; the template remains as the Reading |
| Different fingerprint (`stale_request`) or rejected selection | "The response does not correspond to the current calculation", and the template is kept |
| Editing | The reducer aborts the request; the Reading returns to `--o-busy` until re-evaluation |
| Export | `buildMissionExport(request, evaluation, bundle, {draft, explanation})`. The template is **not** recorded as AI (`ai.explanation: null`) |

**There are no automatic calls:** the lktron startup upon entering the `analysis` phase is removed, which now ends in `done` as soon as the template is available.

### 5.5 Reading in Explore

- In Explore there is no AI operation, because `explain` needs a confirmed request.
- The Reading shows only "Snapshot facts" and the base robustness, labeled "Deterministic reading". It carries no ✦.

## 6. ADR renumbering

origin/dev already occupies ADR-008 (`global-discovery-pilot`, accepted) and ADR-009 (`mission-guided-recommendation`, accepted). ADR-007 is identical in both branches.

| Current (our branch) | New | State after integration |
|---|---|---|
| `ADR-008-escenario-fijo-y-hoja.md` | `ADR-014-escenario-fijo-y-hoja.md` (ADR-010 until the M9/M10 merge) | Proposed (still pending human acceptance). The relationship is added: it does not affect the team's ADR-008 or ADR-009 |
| `ADR-009-recalculo-determinista-en-cliente.md` | `ADR-015-recalculo-determinista-en-cliente.md` (ADR-011 until the M9/M10 merge) | **Superseded by ADR-009** (guided recommendation). It is not integrated; it is kept as a record of the discarded decision |
| `ADR-010-ia-opcional-fuera-del-flujo-central.md` | `ADR-012-ia-opcional-fuera-del-flujo-central.md` | **Superseded by ADR-009 §7–9** (Anthropic only on the server) |
| — | `ADR-013-integracion-rediseno-planificador.md` | Proposed. Records five decisions:<br>• the redesign UI hosts the planner;<br>• precompiled validators in the main chunk and runtime Ajv only in the mission chunk;<br>• the Reading combines the deterministic template with an optional AI explanation;<br>• there are no automatic calls to the AI;<br>• the flow without AI requires manual requirements (§3.6). |

**Procedure** (in this order, so that paths do not collide):

1. Rename with `git mv` 010→012, then 009→011 and finally 008→010.
2. Update the references **only in the files that come from our branch** and are not deleted in F6. Outside `docs/decisions` there are currently 56 references in 36 files, and about half of those files are deleted along with engine and lktron:
   - `apps/web/src/shell/{AppShell.tsx,layout.ts,shell.css,stageGeometry.js}`;
   - `apps/web/src/shell/sheet/{Sheet.tsx,resolveDetent.ts,useKeyboardInset.ts}`;
   - `apps/web/src/shell/detail/FullDetail.tsx`;
   - `apps/web/src/features/globe/MapStage.css`;
   - `apps/web/src/features/composer/missionRun.test.ts`;
   - `apps/web/src/features/analysis/README.md`;
   - `apps/web/src/tests/{shell.test.tsx,mapZoom.test.ts}`;
   - `docs/UX_REDESIGN.md`, `docs/BUILD_CONTRACTS.md`, `tests/fixtures/contracts/README.md`, `project/STATUS.md` and `project/CHANGELOG.md`.
3. The mentions of ADR-008/009 in dev files (including the comment in its `vite.config.ts`) are correct and **are not touched**.
4. Verify with `git grep -nE "ADR-0(08|09|1[0-3])"` and review each occurrence:
   - ADR-008 = discovery pilot;
   - ADR-009 = guided recommendation;
   - ADR-014 = fixed scenario (was ADR-010; the team used ADR-010/011 for the M9/M10 geology);
   - ADR-015 (was ADR-011) and ADR-012 = superseded;
   - ADR-013 = integration.

   In addition, `ls docs/decisions | cut -c1-7 | sort | uniq -d` must return nothing.

## 7. Tests

Measured baseline:
- **Our branch:** pytest 170 pass and 1 is skipped; vitest 857 in 57 files.
- **origin/dev:** pytest 173 pass and 4 are skipped (they require `data/raw`); vitest 196 pass and 2 are skipped (real AI, opt-in); `typecheck:server` correct.

### 7.1 From the team: kept with assertions intact

`apps/web/src/tests/{aiServer,aiLive,missionEngine,missionGeometry,plannerState,plannerUi,missionFormat}.test.*` and `tests/test_discovery.py`.

- `aiLive` remains opt-in: `npm run test:ai-live` is **not** run without explicit authorization from the user.
- `plannerUi` and `missionFormat` continue to render `components/planner/*` with the usual signature (§2.4).
- `missionFormat` reads `App.tsx` (§2.5).
- At the end, `git diff origin/dev -- <estos archivos>` must come out empty.

### 7.2 Shared (exist in both branches)

| Test | Situation | Action |
|---|---|---|
| `domain`, `globe`, `snapshot` (web); `test_constraints`, `test_contracts`, `test_precision_artifacts`, `test_science_artifacts`, `test_scoring`, `test_visual_context` (Python) | Neither branch changed them | Kept |
| `surfaceSeries`, `visualContext` | Changed only by dev (7 series of 12 months; `visual-context-v3`) | Dev's versions are adopted. `contextLayers` must also pass our two cases with the v2 index |
| `basemaps`, `mapZoom`, `test_basemaps.py` | Changed only by us | Kept; in `mapZoom` only the ADR mention is updated |
| `mapStage.test.ts` | Changed in both and merged without conflict; imports `features/globe/MapStage` and requires `visual-context-v3` (7 layers, 3 `s2-ar-*`) | Kept; made to pass by `contextLayers` according to `snapshot_version` |
| `tests/test_release_package.py` | Changed in both and merged without conflict, but broken: our preload cases point to `./science-v2/manifest.json` and `./visual-context/index.json` | The preload cases are rewritten against the v3 paths. Those of `BASEMAP_FILES` are kept. Those of `ANALYSIS_FILES` are removed |
| `discovery.test.tsx` (from dev) | Imports `../components/CandidateMap` (now in `features/globe/`), `CandidateRanking` and `CandidateDetails` (retired) | The contracts, roles, search, export and map blocks are **kept with their assertions**; only the path of `CandidateMap` changes. The "ranking and detail sheet" block is ported with **the same expected texts**: the ranking to `places/PlaceRail.test.tsx` and the detail sheet to `shell/detail/OriginSection.test.tsx`. It is recorded in STATUS as ported, not deleted |

### 7.3 Ours: kept unchanged

- `globe/{flight,geometry,keyboard,selectionCamera}.test.ts`
- `leaders/{layoutLeaders,projector,controller}.test.ts`
- `tests/{reducedMotion,resolveDetent}.test.ts`

### 7.4 Ours: rewritten

| Test | What changes |
|---|---|
| `globe/markers.test.ts`, `globe/MarkerLayer.test.tsx` | "REF" label without a number; grouping by country; types according to `OptionStatus`; no mission % |
| `places/places.test.ts`, `places/PlaceRail.test.tsx` | REF outside the ranking; country filter with global rank; honest empty state; groups by status in Mission; diagnostic when `outcome ≠ evaluated`. They also receive the assertions ported from `CandidateRanking` (`>REF<`, `aria-label="Filter candidates by country"`, the Argentine global rank, "The search left no candidates in Argentina", "Known reference: Yungay") |
| `metrics/{metricContext,buildMetricViews}.test.ts`, `metrics/MetricRail.test.tsx` | No mission weights; requirements layer (✓/✕/○, `reason`, scale); area and country rows; "Territorial feasibility: pending"; "Best of N" without REF |
| `leaders/{principal,labelModel}.test.ts`, `leaders/leaders.test.tsx` | Main metrics ordered by requirement; label with `describeCondition`; no out-of-scope lines |
| `boot/boot.test.tsx`, `tests/boot.test.ts` | v3 preload; chip "6 candidates · 1 REF"; brand "AnalogOS · Chile–Argentina Pilot" |
| `composer/{Composer.test.tsx,missionRun,model,history}.test.ts` | On `MissionController` and `plannerReducer`:<br>• "Send" does not call the AI;<br>• it is never confirmed on its own;<br>• an edit invalidates and aborts;<br>• v2 history without AI provenance;<br>• visual thresholds without their own timeout, with the threshold cases brought over from `missionPhase.test.ts` |
| `analysis/{runtime,controller,evidencePacket→facts,robustness}.test.ts`, `analysis/ReadingView.test.tsx` | Against `MissionEvaluation` and `ExplanationView`; they accept `ar-` sites; the REF as a separate fact; sensitivity from the pipeline |
| `tests/comparison.test.ts` | Dev signature (`ranked`, `references`, `rankOf`) |
| `tests/featureContracts.test.ts` | Without the `engine` entry; without `LKTRON_ENABLED`, `interpretWithLktron` or `LktronResult`; with the composer's new exports |
| `tests/shell.test.tsx` | Brand, Origin and Method tabs, ADR references |
| `tests/uiStore.test.ts` | Phase `review`, which does not count as occupied |
| `tests/validators.test.ts` | New `OUTPUTS` (`discovery-search`, `precedent-catalog`). They continue to accept v3, v2, v1 and demo, and to reject the 9 broken cases from dev |

### 7.5 Removed (obsolete)

| Test | Reason |
|---|---|
| `features/engine/{aggregate,parity,profiles,scoreMission,demoMatcher,missionPhase}.test.ts` | The weight-based recalculation engine is retired (ADR-015, superseded). The threshold cases of `missionPhase` are moved to the composer |
| `tests/test_engine_parity.py` and `tests/fixtures/engine/` | They checked that the TS port of `aggregate` gave the same results as `scoring.py`. Without a port, there is no parity to verify. `test_scoring.py` continues to cover the pipeline |
| `features/analysis/{lktron,ndjson,eventGate,analysisTokens,fnv,pregenerated,integration}.test.ts` | The lktron NDJSON channel, the `{{id}}` tokens, the FNV fingerprint and the pregenerated prose are retired (ADR-012, superseded by ADR-009 §7–9) |
| `apps/web/src/tests/aiContracts.test.ts` and `tests/test_ai_contracts.py` | They validated `mission-interpretation`, `evidence-packet` and `ai-analysis`, which are being retired. The new contracts are covered by `missionEngine`, `plannerState` and `aiServer` |
| `tests/fixtures/contracts/` fixtures for those three contracts, plus their entries in `expectations.json` | Contract retirement. The `reference-analog` ones are kept |

### 7.6 New tests

| Test | What it checks |
|---|---|
| `composer/MissionController.test.tsx` | A single planner shared by the dock, "Your mission", the carousel and the rail. No automatic calls to the AI. An edit invalidates the scenario and aborts on the network |
| `analysis/explanationToReading.test.ts` | All figures come from `evaluation`. The template is labeled and carries no ✦. ✦ only with `anthropic`. A different fingerprint falls back to the template |
| `tests/bundleParity.test.ts` | The bundle the web passes to `evaluateMission` has the same canonical fingerprint as the server's `loadTrustedBundle()`. Otherwise, every AI explanation would end up in `stale_request` |
| `tests/referenceNeverRanked.test.ts` | In Explore, Yungay never receives a rank in places, globe, metrics or analysis |
| `tests/copy.test.ts` | No surface contains "% of the deterministic engine", "DEMO · no AI", "level ÷ sum", "Your mission profile", "M8", "AnalogOS Chile" or `VITE_LKTRON` |
| `shell/detail/OriginSection.test.tsx` | The ported record-sheet part of `discovery.test.tsx` (§7.2) |

## 8. Order of the steps

Work is done on `feature/mision-redesign`; if you want to be able to abandon the work, use a child branch `feature/integracion-dev`. **There is no local checkout of `dev` or `main`.** The environment is as follows:
- Python: `PATH=/tmp/claude-venv314/bin:$PATH`. If needed, `pip install -e ".[dev]" pillow`.
- Browser: playwright-core in `/tmp/claude-pw`.
- Static server: `node /tmp/claude-srv/serve.mjs <dist> <puerto>`, which must be restarted after each build.

Each phase ends with its gate and its commit in Spanish with the session trailers.

### F0 · Baseline

1. Clean tree. Note down `git rev-parse HEAD origin/dev`.
2. Repeat the measurement from §7 on both branches and record it.
3. Note down the SHA of `submission/analogos-static.zip`.

### F1 · Merge and conflicts

1. `git merge --no-ff --no-commit origin/dev`.
2. Resolve the 16 paths:

| Path | Type | Resolution |
|---|---|---|
| `apps/web/src/App.tsx` | content | Ours, plus the texts from §2.5 |
| `apps/web/src/breakdown/ScoreBreakdown.tsx` | modified/deleted | Delete (§2.5) |
| `apps/web/src/components/CandidateComparison.tsx` | content | Signature from dev and our style |
| `apps/web/src/components/CandidateDetails.tsx` | modified/deleted | Delete; the source block moves to `OriginSection` (in F3) |
| `apps/web/src/components/{CandidateFlatMap,CandidateGlobe,MapStage}.tsx` | modified/deleted | Delete; the changes are ported to `features/globe/*` (in F2–F3) |
| `apps/web/src/components/LiquidNav.tsx` | modified/deleted | Delete |
| `apps/web/src/data/loadDemoSnapshot.ts` | content | The one from dev |
| `apps/web/src/domain/contracts.ts` | content | Ours, precompiled, with `shared` types (§2.1) |
| `apps/web/src/features/globe/CandidateMap.tsx` | content (rename detected) | Content from dev with `../../` paths |
| `apps/web/src/styles.css` | content | Ours, plus the essential styles of the search SVG; `planner.css` is imported from its components |
| `apps/web/vite.config.ts` | content | Union (§2.3) |
| `project/STATUS.md`, `project/CHANGELOG.md` | content | The full text from dev, plus a new block at the top |
| `scripts/package_release.py` | content | Merge according to §2.6 |

3. The same commit also includes these mechanical fixes:
   - rename `chileOutline`→`outline`;
   - regenerate the validators;
   - change the path of `CandidateMap` in `discovery.test.tsx`.
4. **F1 gate:**
   - `npm run typecheck:server` green;
   - `tsc --noEmit` green;
   - pytest green, except for `test_release_package.py`, which is fixed in F2;
   - `git diff --quiet origin/dev -- <lista de §9.3>`;
   - the team suites from §7.1 green.
5. Suggested commit message (translated): "Merge origin/dev (v3 pilot, planner and Anthropic AI) into the redesign".

### F2 · v3 data, contracts, build and server

1. `build-validators` with `discovery-search` and `precedent-catalog`. Remove the lktron validators once nobody imports them anymore; otherwise, in F6.
2. Precompiled `assertDiscoveryContracts`.
3. `loadingHints` and `snapshotCredit` in v3.
4. `contextLayers` according to `snapshot_version`.
5. `prune-build` and `vercel.json` from dev.
6. `package_release.py` and `test_release_package.py`.
7. **F2 gate:**
   - `npm run build` green;
   - `visualContext`, `mapStage`, `surfaceSeries`, `snapshot`, `validators` and `discovery` (retained blocks) green;
   - local smoke test: `npx vite preview` in `apps/web`, without `.env`, responds `GET /api/ai` → 405 `method_not_allowed` and `POST {operation:'draft', client_request_id:'ci-startup-0001', brief:'x'}` → 503 `ai_unavailable` with `cache-control: no-store`.

### F3 · Explore v3

1. `splitByRole`, `rankOf`, REF and country in markers, places, metrics and analysis.
2. The country filter in `PlaceRail`.
3. `OriginSection`, "Export record sheet", "How they were searched" in Method and `CandidateComparison`.
4. Boot and brand.
5. **F3 gate:**
   - rewritten tests for globe, places, metrics, boot, comparison and shell, plus those ported from `discovery`, green;
   - in the browser, on desktop (1440) and mobile (390×844): 6 candidates, the REF and the ◆; the country filter; the REF without a number; Origin and Method; record sheet download.

### F4 · Mission on top of the planner

1. `MissionController` and new `state/mission.ts`; phase `review`.
2. Split `PlannerPanel`/`PlannerView` and `ResultView` with `compact`.
3. Composer and "Your mission" (§3).
4. Carousel, globe, rail and lines according to `MissionEvaluation` (§4.2); export and printing.
5. Lazy loading (§3.8).
6. **F4 gate:**
   - `plannerUi`, `missionFormat`, `plannerState`, `missionEngine` and `missionGeometry` untouched and green;
   - composer, places, metrics and leaders rewritten and green;
   - `MissionController.test` and `bundleParity` green;
   - in the browser, without a key: example → confirm → evaluate → groups → requirements layer on the rail → JSON → print. Editing invalidates. The AI button says "not available". A point outside coverage gives the exportable diagnostic.

### F5 · Reading and retirement of lktron

1. The adapters from §5.3; default template; "✦ Highlight reasons with AI" going through the reducer.
2. Facts layer without `^cl-`; robustness from the pipeline.
3. Delete `lktron*`, `ndjson`, `eventGate`, `analysisTokens`, `TokenText`, `factIds`, `fnv` and `pregenerated`, together with their tests.
4. **F5 gate:**
   - analysis tests rewritten and `explanationToReading` green;
   - `git grep -nE "lktron|LKTRON|ndjson"` returns only occurrences in ADR-012 and in the CHANGELOG.

### F6 · Retirement of the in-house engine, contracts, ADRs and documentation

1. Delete:
   - `features/engine/*` (except what was moved to composer in F4);
   - `tests/test_engine_parity.py` and `tests/fixtures/engine/`;
   - the three lktron contracts with their fixtures and validators;
   - `domain/aiContracts.ts` and `domain/interpretationContract.ts`;
   - `scripts/make_pregenerated_analysis.py` and `artifacts/analysis/ai-analysis.default.json`.
2. Update `featureContracts.test.ts`.
3. ADR: renumber according to §6 and create ADR-013.
4. Documentation:
   - `docs/UX_REDESIGN.md` §5: mark as superseded by `contracts/mission-ai.schema.json` and ADR-009;
   - update §3.2 and §3.7:;
   - `docs/BUILD_CONTRACTS.md` §2.6 and §2.8: engine retired, analysis without lktron;
   - `README.md` if it mentions lktron or the mission %;
   - `project/NEXT_TASK.md`: record that the human team directly requested this integration and the push to dev, in a "direct user decision" block that keeps Codex's accepted M8 assignment.
5. `docs/AI_SETUP.md` and `docs/DEV_AI_VERIFICATION.md` are not touched.
6. **F6 gate:**
   - `git grep -nE "features/engine|MissionScoring|profileFromLevels|matchMissionDemo|motor determinista v"` empty outside ADR-015 and the CHANGELOG;
   - the ADR checks from §6;
   - `npm run test` green.

### F7 · Full verification and publication

1. `PATH=/tmp/claude-venv314/bin:$PATH npm run verify`.
2. `npm run release:package` twice: same SHA and correct allowlist. Open the ZIP from `file://` without a network.
3. `/api/ai` smoke test (as in F2), on the final build.
4. Full browser review (§9.8), with no console errors.
5. Update STATUS and CHANGELOG: what works, how to run it, tests with their numbers, files changed, decisions, blockers and the next three steps.
6. Push **only at the step authorized by the user:** `git fetch origin` and check that `origin/dev` is still at `92392f1`, or at a descendant that must be merged first. Then `git push origin HEAD:dev`, which must be a fast-forward, never `--force`. **The pushed HEAD must not carry `[skip ci]`.**
7. Follow the Actions run with `gh run list --branch dev` and `gh run watch`: `vercel build`, `check-vercel-function` (GET 405 and POST without key 503), deploy with the injected key and the alias `analogos-dev.vercel.app`.

## 9. Done criteria

1. **`npm run verify` green** (pytest, `typecheck:server`, vitest and build): 0 failures in all of them. The only permitted skips are those that require `data/raw` and the 2 tests of `aiLive`.
2. **Team tests untouched:** `git diff origin/dev -- apps/web/src/tests/{aiServer,aiLive,missionEngine,missionGeometry,plannerState,plannerUi,missionFormat}.test.* tests/test_discovery.py` comes out empty. In `discovery.test.tsx` only the path of `CandidateMap` and the ported block change, which is listed in STATUS.
3. **Scientific baseline:** `git diff --quiet origin/dev -- artifacts/demo artifacts/science-v1 artifacts/science-v2 artifacts/science-v3 artifacts/visual-context artifacts/visual-context-v3 config/mission_profiles config/discovery_search_v3.json config/analog_precedents_v1.json config/visual_observations_v3.json contracts/candidate-site.schema.json contracts/data-manifest.schema.json contracts/mission-profile.schema.json contracts/discovery-search.schema.json contracts/precedent-catalog.schema.json contracts/mission-request.schema.json contracts/mission-evaluation.schema.json contracts/mission-export.schema.json contracts/mission-ai.schema.json submission/analogos-chile-static.zip` returns 0.
4. **Server:**
   - `npm run typecheck:server` correct;
   - `grep -rn "apps/web" shared server api` empty;
   - `git diff --quiet origin/dev -- shared server api tsconfig.server.json vercel.json .github scripts/check-vercel-function.mjs` returns 0.
5. **`/api/ai` smoke test on the final build:** GET → 405 `method_not_allowed`; POST of `draft` without key → 503 `ai_unavailable` with `no-store`.
6. **Release:**
   - `npm run release:package` repeated gives the same SHA and the ZIP contains only the allowlist;
   - from `file://` and without a network, Explore and manual Mission work through to exporting the JSON, and the AI buttons say "not available";
   - STATUS lists the previous and the new SHA.
7. **Bundle:**
   - the entry chunk does not contain the Ajv compiler;
   - the gzip increase compared with `9b32457` respects the budget in UX_REDESIGN §6.1 (+12 KB gz at most in the main chunk), or the deviation is justified in STATUS;
   - the planner, the AI client and `shared/mission/validate` go in a lazily loaded chunk.
8. **Browser, desktop 1440 and mobile 390×844:**
   - **Explore:** 6 numbered candidates, the REF without a number, the ◆ "to be calculated", the country filter with global rank, Origin, Method with the 50 windows and the export of the profile.
   - **Mission without a key:** complete walkthrough, out-of-coverage point diagnostic and invalidation on edit.
   - **Reading:** labeled template and ✦ absent.
   - **Accessibility:** visible focus, keyboard navigation and data attribution always visible.
   - **Console:** no errors.
9. **Texts:**
   - `App.tsx` contains the two required sentences;
   - `copy.test.ts` green;
   - no surface says "M8", shows a mission % or is labeled "DEMO".
10. **ADRs:** 001–015 with no repeated numbers (after the M9/M10 merge, the fixed scenario and the recalculation moved to 014 and 015); ADR-015 and ADR-012 marked as superseded; ADR-013 proposed; the references, reviewed.
11. **Documentation:**
    - STATUS and CHANGELOG keep the dev text with a new block on top;
    - NEXT_TASK records the user's decision;
    - UX_REDESIGN §5 and BUILD_CONTRACTS §2.6 and §2.8 are updated;
    - the handoff states that Codex can resume by reading `prompts/RESUME_CODEX.md` and `project/STATUS.md`.
12. **Security:**
    - `git grep -nE "sk-ant-|ANTHROPIC_API_KEY=."` empty;
    - `.env` untracked;
    - no `VITE_ANTHROPIC*` or `VITE_LKTRON*`.
13. **Dependencies:** `git diff --quiet origin/dev -- package-lock.json` and no new dependencies in `package.json`.
14. **CI:**
    - the push to dev is a fast-forward;
    - the `vercel-deploy.yml` run ends green (build, function check, deploy and alias);
    - `analogos-dev.vercel.app` loads with an authorized session, without disabling Vercel Protection. If there is no authorized session, the remote check of the real AI stays in STATUS as pending for the team.

## 10. Remaining risks and open decisions

| Risk or decision | Mitigation or proposal |
|---|---|
| The web bundle is not byte-equivalent to the server's, and every AI explanation ends up as "does not correspond to the current calculation" | `bundleParity.test.ts`: never filter or transform the snapshot before `evaluateMission` |
| A forgotten `rankCandidates(todos)` puts Yungay at #4 | `referenceNeverRanked.test.ts` and the F3 grep |
| The flow without AI is longer ("add requirements") | Accept it explicitly (ADR-013). "Use example" stays one click away |
| Greater weight of the mission chunk due to Ajv at runtime | Lazy loading. Precompile `mission-*` only if the output goes inside `shared/` (never in `apps/web`, which is ESM) and with `check-vercel-function` green. Postponed |
| The body of `explain` includes the brief (up to 3000 characters) and has a cap of 24 KB | No changes. The text next to the button is the team's |
| Prefetch of the 7 layers: 6 are PNGs of 1,1 to 1,2 MB | Optional: prefetch only the selected layer on mobile. The v3 WebPs would be new (non-scientific) files and are deferred |
| The HLS backgrounds of Domeyko and María Elena (v2) and the label "Norte de Chile" over Argentine windows | Show only the layers whose `site_id` exists in the active snapshot, and label the region in the UI without editing `basemaps.json`. Team decision |
| Governance: the `CLAUDE.md` and the `NEXT_TASK` on dev say that Claude has no assignment | Record in STATUS, CHANGELOG and NEXT_TASK that the user directly requested this integration and the push |
| Push to dev = immediate deployment, because the workflow does not run tests | F7 requires `verify` locally before the push. If the workflow fails, fix it with a new commit, never with `--force` |

## 11. Merge of the team's M9/M10 (2026-11-15, `origin/dev` `d2252b6`)

`origin/dev` advanced from `92392f1` to `d2252b6` (M9: official geological context by sector; M10: geology in the AI test guidance; robustness of the Vercel function). It was merged without squashing. Everything from the team remains **intact**: `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, root `package.json` and `package-lock.json`, `geology-context-v1` contracts and artifacts, scientific pipelines, evidence and their tests (`aiGeology`, `geologyGuidance`, `plannerGeology`, `plannerState`, `aiLive`, `test_geology_*`). They have differed since before this merge, and not because of it: `apps/web/package.json` (`build` has been running `build-validators.mjs --check` since the previous integration; `vercel build` + `check-vercel-function.mjs` verified) and, since the redesign, `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` and `contracts/reference-analog.schema.json`. Its UI was **ported** to the integrated interface, with the same texts and guarantees.

| From the team (dev) | In the integrated interface |
|---|---|
| `App.tsx` loads `loadGeologyContext` after the snapshot | `App.tsx` requests it at an idle moment via `data/loadAppGeology.ts` (deferred chunk: the validator uses Ajv at runtime). `AppData.geology` (optional) carries the state and the sectors with a valid record (`selectGeologySite`). It never blocks anything |
| `CandidateDetails` › `GeologyContext` (coverage, units, provenance, "Download geological context (JSON)") | **"Geology"** tab of the record (520 px rail and S2 sheet), after "Origin": `shell/detail/GeologyTab.tsx` mounts the team's `GeologyContext` unchanged. Its styles move from `styles.css` to `shell/detail/geology.css` (loaded with the tab) |
| `ScoreBreakdown`: text of the pending geological criterion with context | `MetricDetails` (Metrics) with `domain/geologyCopy.ts`: same text; the criterion remains "to be calculated" and outside the score |
| "Where the analogy fails": updated historical limitation | "Sources" tab: same replacement, but "consult it in the "Geology" tab" instead of "above" (the panel is no longer above) |
| `usePlanner(bundle, geology)` › `GeologyUi`, `runExplain(withGeology?)`, geological export | `missionController`: `setGeology`, catalog closed per evaluation (`buildGeologyCatalog`, memoized), `runExplain(withGeology?)` with `geologyContextFp`, `geology_context_changed`, `exportGeologyJson` (`buildMissionGeologyExport`) and `api().geologyUi`. The shell records the state with `registerMissionGeology` (`runLoader`) |
| `ResultView` › `AiPanel`: checkbox "Include geological guidance…", single conditional notice, "Retry without geology" | The Reading (`AiControls`), where "✦ Highlight reasons with AI" lives: same texts (constants in `explanationToReading.ts`, checked against the team's `AiPanel` in `ReadingView.test`). The checkbox is disabled while the request is in progress |
| `ResultView` › `GeologyGuidance` and `PrintGeology` | "Your mission" (compact `ResultView`) carries the team's `GeologyGuidance` unchanged, **collapsed after exporting** (`<details>` closed; the summary reads "Geological guidance for this test", the team's label —"AI selection" or "General guidance without AI"— and the number of sectors), with a line indicating that the AI selection is requested in the Reading. Expanded inline it added 4.100–5.200 px to a strip of 344–676 px and left "Download JSON" and "Back to edit" 4–5 times farther down. The printable report (`MissionPrintReport`) receives `missionStore.geologyCatalog` and includes `PrintGeology` |
| `PlannerPanel(snapshot, intent, geology)` | Wrapper with the same signature: `usePlanner(bundle, geology)` + `PlannerView`, which passes `geologyUi` to `ResultView` |

**Verified guarantees:** the AI only chooses ids from the closed catalog; the team's reducer discards any response whose context, catalog, request or evaluation does not match; receiving the context or the selection does not change `state.result` or its fingerprints (`MissionControllerGeology.test.ts` recalculates and compares); without opt-in the fingerprint is not sent and a response with unrequested geology is discarded; the M8 export 1.0 does not change and the geological one validates with `validateAnyMissionExport`.

**ADR:** the team numbered ADR-010 (geological context, accepted) and ADR-011 (geological guidance) on dev. Ours with those numbers become **ADR-014** (fixed scenario, proposed) and **ADR-015** (client-side recalculation, superseded); ADR-012 and ADR-013 do not change. The historical blocks of STATUS and CHANGELOG keep the numbering of their date.

