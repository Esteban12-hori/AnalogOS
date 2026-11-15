# Parallel build contracts (Explore / Mission redesign)

> **Historical assignment document.** The branches are already merged into `dev` (`dd625b4`). ADR-013 and ADR-014 accepted by Codex on 2026-11-15; review in `docs/CODEX_INTEGRATION_REVIEW.md`. It does not assign new builders or authorize parallel work: the current assignment lives in `project/NEXT_TASK.md`.

This document distributes increments 3 to 10 of `docs/UX_REDESIGN.md` §7.1 among **8 builders working simultaneously in separate worktrees**. Each one edits only their own folder and the files assigned to them here. Everything else belongs to the **integrator**.

- **Status (2026-11-14):** the 8 branches `build/*` were merged into `feature/mision-redesign`. The integrator's adjustments and what remains pending are in `project/STATUS.md`.
- **Base:** branch `feature/mision-redesign`, at the commit that introduces this document (`git log -1 -- docs/BUILD_CONTRACTS.md`). That commit brings increments 0, 1 and 2: contracts, tokens, store, shell and slots with stubs.
- **Specification:** `docs/UX_REDESIGN.md`. Decisions: ADR-014 (fixed stage, proposed), ADR-015 and ADR-012 (superseded by the team's ADR-009) and ADR-013 (integration, proposed), in `docs/decisions/`. Before integrating with dev they were numbered ADR-008, ADR-009 and ADR-010.
- **Integration with dev (2026-11-14, ADR-013):** the interface of this assignment now hosts the v3 snapshot, the planner and the team's AI (`shared/mission`, `server/ai`). `engine` (§2.6) was retired; `composer` (§2.7) and `analysis` (§2.8) changed interface, as indicated in each section. The complete plan is in `docs/INTEGRATION_PLAN.md`.
- **Project rules:** `CLAUDE.md` and `AGENTS.md`. The most sensitive ones here:
  - the AI never scores or produces figures;
  - similarity, confidence and feasibility are always kept separate;
  - nothing is invented: what does not exist is shown as "to be calculated";
  - offline first: the AI is optional (after ADR-013, the team's Anthropic one, only with explicit buttons);
  - strict TypeScript and no `any`;
  - **0 new npm dependencies** (§6.2);
  - keyboard, visible focus and `prefers-reduced-motion` are mandatory.

---

## 1. Common rules for the 8 builders

1. **Ownership.** Edit only your folder `apps/web/src/features/<key>/` and the files that the table in §2 assigns to you. If you need to change a shared file (§4), do not touch it: describe it in your delivery and the integrator applies it.
2. **Stable interface.** Your `index.ts` exports types and signatures that other features already consume.
   - **You may:** add exports and add **optional** fields.
   - **You may not:** rename, remove or change the type of what is already signed.
   - **Guard:** `apps/web/src/tests/featureContracts.test.ts` fails if an export is missing.
3. **Cross-feature consumption.** Import from another feature only from its `index.ts` (`import { X } from '../places'`), never from an internal file.
   - From the shell, only `apps/web/src/shell/public.ts`.
   - From shared state, only `apps/web/src/state/ui.ts` (`useUi`, `uiActions`) and `apps/web/src/state/mission.ts` (`useMission`, `missionStore`).
   - For contract types: `domain/contracts.ts` and `domain/aiContracts.ts`, with `import type` when possible.
4. **Current implementation.** Today each `index.ts` points to an **honest stub**: it does not invent figures and labels "to be calculated". Replace the stub with the real implementation inside your folder.
5. **Tests.**
   - They go in your folder: `features/<key>/*.test.ts(x)`. Vitest picks them up automatically and they run in Node, without jsdom. Test pure functions and render with `react-dom/server` (`renderToStaticMarkup`).
   - Do not edit shared tests in `apps/web/src/tests/`.
   - If a stub test no longer applies because you implemented it (e.g. the engine's "to be calculated" one), notify the integrator.
6. **Styles.**
   - Each feature brings its own CSS, imported by its components, with its own class prefix: `.places-*`, `.globe-*`, `.metrics-*`, `.leaders-*`, `.boot-*`, `.composer-*`, `.analysis-*`. The stubs use `*-stub`: delete them.
   - Use the tokens from `shell/tokens.css`: `--ease-*`, `--dur-*`, `--stagger-*`, `--o-busy`, `--o-dim`, colors with meaning, `--fs-*`, `--marker-bg`, `--focus-ring`.
   - Use the glyphs from `GLYPH` (`shell/glyphs.ts`).
   - Do **not** use `backdrop-filter`: blur belongs only to the shell surfaces (≤3 on desktop, 1 on mobile).
   - Do **not** style shell classes (`.app`, `.dock`, `.rail`, `.sheet`, `.topbar`…).
7. **Motion** (§2.2). Animate only `transform` and `opacity`. No loop exceeds 4,8 s. No figure is interpolated. With reduced motion: no translate, scale or rotate, and with opacity ≤150 ms.
   - Read the preference with `useReducedMotion()` or `prefersReducedMotion()`, which come from `shell/public`.
   - There is no per-frame `setState`: direct manipulation goes through a ref or a CSS variable.
8. **Announcements.** Do not create your own `aria-live` regions. Use `announce(texto)` or `announce(texto, 'alert')` from `shell/public`. The only exception: the metrics carousel on mobile, following the APG pattern.
9. **Weight** (§6.1). What does not fit in the main chunk is loaded with `lazy()` or `import()`.
   - One validator module per chunk: `validators.generated.js` (snapshot, main), `validators.analogs.generated.js` (◆ catalog, via `domain/referenceAnalogContract.ts`), `validators.interpretation.generated.js` (mission, via `domain/interpretationContract.ts`) and `validators.mission.generated.js` (package and analysis, via `domain/aiContracts.ts`). The last three only from deferred code.
   - Total main chunk budget: **+≤12 KB gz** of JS and **+≤5 KB gz** of CSS compared to `857b05f`. The shell has already consumed +2,6 KB of JS and +1 KB of CSS.
10. **Data.** Every figure comes from the snapshot (`data.snapshot`) or from the engine (`features/engine`).
    - Fixtures only in `tests/fixtures/` and marked `FIXTURE`.
    - Do not regenerate `artifacts/science-v2/` or `submission/`.
11. **Delivery.**
    - `npm run test` and `npm run build` green in your worktree, and `/tmp/claude-venv314/bin/python -m pytest -q` if you touched Python.
    - Commit on your branch with a message in Spanish.
    - Final message with: files touched, new exports, changes requested to shared files and risks.

### Worktree

```sh
git worktree add ../AnalogOS-<key> -b feature/mision-<key> feature/mision-redesign
cd ../AnalogOS-<key> && npm ci          # o: ln -s ../AnalogOS/node_modules node_modules
npm run test && npm run build
```

---

## 2. File ownership, slot and interface per feature

All paths are relative to `apps/web/src/`, unless they start from the repo root (`config/`, `tests/`, `artifacts/`).

### 2.1 `places` · increment 3 · PlaceRail and ◆ catalog

**Owned files:**
- `features/places/**`
- `config/reference_analogs.json` (new). Validates against `contracts/reference-analog.schema.json` with `parseReferenceAnalogs`. Only ◆ entries with a cited source are included.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `dock.places` | ≥1100, top row of the dock (query container `dock`) | `<PlaceRail placement="dock">` |
| `sheet.tray.places` | <1100, S0 tray | `<PlaceRail placement="sheet">` |
| `sheet.list` | S1/S2 with no selection | `<PlaceRail placement="sheet" listView>` |
| `rail.reference` | rail with a ◆ selected | `<ReferenceCard>` |
| `sheet.reference` | sheet with a ◆ selected | `<ReferenceCard>` |

**Interface:**
- `PlaceRail(props: PlaceRailProps)`, with `{ data, placement: 'dock' | 'sheet', listView?, onListViewChange? }`.
- `ReferenceCard({ data, analogId })`.
- `useReferenceAnalogs(): ReferenceAnalogsState`.
- `loadReferenceAnalogs(): Promise<ReferenceAnalogsState>`.
- `ReferenceAnalogsState = loading | ready{analogs} | unavailable{reason}`.

**Consumes:**
- `useUi`: `selection`, `mode`, `missionPhase`, `hoverSiteId`.
- `uiActions.select` (with `kind: 'reference'` for a ◆) and `uiActions.setHover`.
- `useMission`: `scoring` and `profile`, for the order and the % in Mission.
- `rankCandidates`.

**Notes:**
- It is drawn as soon as `data.status === 'ready'`.
- While waiting for the AI, the previous results go to `--o-busy` with `aria-busy` and without `inert`.
- `onListViewChange` is not wired up yet: the integrator adds it if needed.

### 2.2 `globe` · increment 4 · ●◆○ markers, flight and grouping

**Owned files:**
- `features/globe/**`: `MapStage.tsx`, `MapStage.css`, `CandidateGlobe.tsx`, `CandidateGlobe.css`, `CandidateFlatMap.tsx`, `CandidateMap.tsx` and `stageBridge.ts`.
- `domain/globe.ts`.
- `tests/globe.test.ts` and `tests/mapStage.test.ts`.

**Slot:** `stage`, the full-screen stage (`.stage`). It remains `inert` and paused in S2.

**Interface:**
- `MapStage(props: MapStageProps)`, with these props:
  - `candidates`, `chileOutline`, `visual`;
  - `selectedId: string | null`;
  - `onSelect`;
  - `insets` (settled margins → `setViewOffset` / `setPadding`);
  - `baseInsets` (global framing, 2D thresholds, poster);
  - `focusSignal`;
  - `paused?`;
  - `onMilestone?('globe' | 'texture', 'ok' | 'error')`;
  - `hudSlot?: ReactNode` (legend strip).
- `contextLayers()`.
- Per-frame channel:
  - `publishStageFrame({ projection, anchor })` (only the globe publishes);
  - `getStageProjection(): StageProjection | null`;
  - `getStageAnchor(): StageAnchor | null`;
  - `subscribeStageFrame(cb)`.
- Types `ScreenPoint`, `StageProjection`, `StageAnchor`.

**Consumes:**
- `useUi`: `selection`, `hoverSiteId`, `introPhase` (landing of choreography A, which writes `boot`) and `cameraTouchedAt`.
- `uiActions.touchCamera()` on any camera input.
- `useReferenceAnalogs()` from `places`, for the ◆ markers.
- `useMission(scoring)`, for the halo order in choreography D.

**Notes:**
- New geometry or flight functions go in `features/globe/`.
- `domain/mapZoom.ts` belongs to `boot`: import it, do not edit it.

### 2.3 `metrics` · increment 5 · MetricRail, buildMetricViews and S1

**Owned files:**
- `features/metrics/**`.
- `breakdown/**` (`ScoreBreakdown.tsx`, `score-breakdown.css`). You may replace or remove it if your `MetricRail` supersedes it.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `rail.metrics` | 340–380 px rail (≥1440, or the "Metrics" tab in 1100–1439) | `<MetricRail variant="rail">` |
| `full.metrics` | "Metrics" tab of the full card (520 px or S2) | `<MetricRail variant="full">` |
| `sheet.s1` | <1100, detent S1 | `<MetricRail variant="sheet">` |

**Interface:**
- `MetricRail({ data, site, variant, onShowOnMap? })`.
- `buildMetricViews(input: BuildMetricViewsInput): MetricView[]`, a pure function, sorted by the weight of the active profile.
- Type `MetricView`, with these fields:
  - `criterionId`, `label`, `weight`, `baseWeight`, `status`, `similarity`;
  - `siteValue`;
  - `marsValue`: only slope, roughness and relief; null for the rest;
  - `rule`;
  - `vsMars`;
  - `isLimiting` and `contribution`: the limiting factor comes from `contribution`;
  - `saturates`;
  - `sharedRegionalWith`;
  - `quality` and `datasetId`.

**Consumes:**
- `useUi`: `activeCriterionId` and `previewCriterionId`; writes with `setActiveCriterion` and `setPreviewCriterion`.
- `useMission`: `profile.weights` and `scoring`, for contributions with the mission profile.
- `snapshot.marsReference`.

**Notes:**
- The place header (`● nombre` + ✕) is provided by the shell. Your `sheet` variant shows "% · ‹ ›" and the content.

### 2.4 `leaders` · increment 6 · Tesla lines

**Own files:** `features/leaders/**`.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `stage.overlay` | fixed layer over the stage, beneath the panels (`pointer-events: none`) | `<LeaderLayer>` |
| `stage.hud` | stage legend strip, via `hudSlot` | `<LeaderToggle>` ("Lines" toggle) |

**Interface:**
- `LeaderLayer({ data })` and `LeaderToggle()`.
- `pickPrincipalMetrics(views, count = 4)`.
- `layoutLeaders(input: LeaderLayoutInput): LeaderLayout`, with `mode: 'lines' | 'docked' | 'chip'`.
- Types `Rect`, `LeaderLayoutInput` and `LeaderLayout`.

**Consumes:**
- Per-frame channel of `globe`: `subscribeStageFrame`, `getStageAnchor` and `getStageProjection`.
- `buildMetricViews` and `MetricView` of `metrics`.
- `useUi`: `selection`, `activeCriterionId`, `stageInsets` (safe area) and `obstacles` (panel rects with `data-obstacle`).
- `useMission(profile)`.

**Notes:**
- It never performs `setState` per frame.
- It is not drawn when a ◆ is selected.
- On mobile, a single line up to the top edge of the sheet.

### 2.5 `boot` · increment 7 · Loading WOW "Honest orbit"

**Own files:**
- `features/boot/**`, including `loadingHints.ts`: Vite plugin, Node code, never imported by the app.
- `boot/posterLayout.js` and `boot/posterLayout.d.ts`.
- `content/shell.ts`: static HTML prior to React. It must mirror the boxes of `AppShell`.
- `data/preload.ts`.
- `domain/mapZoom.ts`.
- `tests/boot.test.ts` and `tests/mapZoom.test.ts`.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `stage.overlay` | over the stage | `<BootLayer>` (ring, satellite, log, reveal) |
| `topbar.status` | right side of the top bar | `<StatusChip>` (the log collapses into the chip) |

**Interface:**
- `BootLayer({ data })` and `StatusChip({ data })`.
- `OrbitLoader({ active, label, placement? })`, reusable for the AI wait.
- `reportBootMilestone(m, status)`, `getBootMilestones()` and `useBootMilestones()`.
- Types `BootMilestone = 'snapshot' | 'globe' | 'texture'` and `MilestoneStatus`.

**Consumes:**
- `useUi(introPhase)`; writes with `setIntroPhase`.
- `useReferenceAnalogs()` of `places`, for "8 to be computed".

**The shell already wires:**
- `reportBootMilestone('snapshot', …)` when the snapshot validates or fails.
- `MapStage.onMilestone` → `globe` / `texture`.

**Notes:**
- `?intro=full` forces the intro.
- The poster must keep matching `baseStageInsets` pixel for pixel: `boot.test.ts` verifies this.
- If the reserved heights change, request it from the integrator: they live in `shell/stageGeometry.js` and `shell/shell.css`.

### 2.6 `engine` · increment 8 · deterministic mission engine (no UI) — **retired**

> **Retired when integrating with dev (ADR-013; ADR-015 superseded by ADR-009).** The evaluation is
> `evaluateMission` of the team (`shared/mission/evaluate.ts`): essential requirements, then
> met preferences, then similarity v3, then `site_id`. `features/engine/**` was deleted,
> `tests/fixtures/engine/**` and `tests/test_engine_parity.py`. Only the visual wait thresholds
> (`PHASE_THRESHOLDS` 3/10 s, with no timeout of their own) in `features/composer/labels.ts` survive.
> The base robustness is read from `analysis-summary.json` (`domain/sensitivity.ts`). The original
> contract is kept as a record:

**Own files:**
- `features/engine/**`.
- `tests/fixtures/engine/**` (new).
- `tests/test_engine_parity.py` (new): generates or verifies parity with `pipelines/scoring.py`.

**Slot:** none. It is a pure library that is imported lazily.

**Interface:**
- `aggregate(criteria, inputs, epsilon, minimumValidWeight): AggregateResult`: port of `pipelines/scoring.py`, parity ≤1e-6.
- `sensitivity(...)`.
- `levelsToWeights(levels)` and `profileFromLevels(levels, base, label?)`, which produces the id `mission:<fnv>`.
- `scoreMission({ profile, candidates, base }): MissionScoring`.
- `matchMissionDemo(text): DemoMatch | null`, the "DEMO · no AI" matcher.
- `nextMissionPhase(phase, event)`.
- Constants `MISSION_PRESETS`, `PHASE_THRESHOLDS` (3/10/20 s) and `ENGINE_VERSION`.
- Types in `types.ts`: `MissionProfileDraft`, `ScoredSite`, `MissionScoring`, `MissionPreset`, `DemoMatch`, `MissionPhaseEvent`, `AggregateInput`, `AggregateResult`, `SensitivityResult`…

**Consumes:** only `domain/*`. It does not read stores.

**Notes:**
- Once implemented, `ENGINE_VERSION` no longer ends in `-stub`, and the stub test of `featureContracts.test.ts` skips itself.
- `matchMissionDemo` returns a `mission-interpretation/1` with `engine: 'demo'`.

### 2.7 `composer` · increment 9 · composer, "Your mission", history and results choreography

**Own files:** `features/composer/**`.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `dock.composer` | ≥1100, bottom row of the dock | `<Composer placement="dock">`. The "Your mission" popover of 1100–1439 is opened by the Composer itself. |
| `sheet.tray.composer` | S0 | `<Composer placement="sheet">` |
| `sheet.head` | S1 header | `<Composer placement="sheet-head" onRequestTray>` ("✦ Refine" button) |
| `left.mission` | ≥1440 in Mission, top section of the left panel | `<MissionCard placement="panel">` |
| `full.mission` | "Your mission" tab of S2 | `<MissionCard placement="sheet">` |

**Interface:**
- `Composer({ data, placement, onRequestTray? })`.
- `MissionCard({ data, placement })`.
- `focusComposer()`.

**Orchestrates the mission (after ADR-013).** It is the **sole writer** of `state/mission.ts`, through
`features/composer/missionController.ts` (lazy chunk): a single instance of the team's planner
(`plannerReducer`, `buildRequest`, `evaluateMission`, `composeExplanation`,
`buildMissionExport`, `aiClient`) shared by the dock, "Your mission", the carousel, the globe, the rail,
the lines and the Reading.
1. "Send" → `set_journey('test')` + `set_brief` and opens "Your mission" at the requirements. **It does not call the AI.**
2. Requirements: manual, "Use example" (`exampleState`) or "✦ Propose requirements with AI" (`requestDraft`, unconfirmed draft; phase `interpreting`).
3. Explicit confirmation with the team's buttons (phase `review`).
4. `evaluateMission` (synchronous): writes `missionStore` (`evaluation`, template `explanation`, `revision + 1`), leaves the recommended #1 in preview and performs a single `announce()`.
5. "✦ Highlight reasons with AI" (from the Reading): `requestExplanation` through the reducer (phase `analysis`).
6. Editing after evaluating: the reducer invalidates; `missionStore.stale = true` and the in-flight request is aborted.

**Added interface:** `registerMissionSnapshot(snapshot)`, `withController(fn)` and `MissionPrintHost` (single printable report).
M11: `MissionPrintHost` is always mounted; without a current evaluation it prints a notice (`printNoticeReason`). `printState.ts` records which result is mounted in the report, and "Print report" in the compact result is only enabled when it is the current `planner.result`. The compact view also offers "Go to the Reading" (`uiActions.requestReading()`).

**Also:**
- It shows the wait with `OrbitLoader` of `boot`.
- It makes a single announcement with `announce()`.
- The "/" key and Esc (cancel) belong to it.

### 2.8 `analysis` · increment 10 · facts, evidence, robustness, Reading and lktron

> **After ADR-013 (lktron removed, ADR-012 superseded by ADR-009 §7–9).** Current interface:
> `ReadingPanel({ data, placement })` and `ReadingPill({ data })`. The Reading has three layers:
> result (`MissionEvaluation`), highlighted reasons (`ExplanationView` of the team: template without ✦
> or validated Anthropic selection) and snapshot facts (`facts.ts`, without package or FNV fingerprint,
> accepts `ar-` sites, the REF goes separately). It consumes `useMission` (`evaluation`, `explanation`,
> `planner.explain`) and calls the AI only with the button, via `withController(c => c.runExplain())`.
> `LKTRON_ENABLED`, `interpretWithLktron`, `LktronResult`, `domain/aiContracts.ts`, the
> pre-generated analysis and their contracts were removed. The original contract is kept as a record:

**Own files:**
- `features/analysis/**`.
- New pre-generated analysis, **outside** `artifacts/science-v2/`. Suggested path: `artifacts/analysis/ai-analysis.default.json`, labeled non-scientific.
  - If it is packaged, ask the integrator to extend `scripts/package_release.py`.

**Slots:**

| Slot | Where it is mounted | Component |
|---|---|---|
| `left.reading` | ≥1440 in Mission, bottom section of the left panel | `<ReadingPanel placement="panel">` |
| `rail.reading` | 1100–1439, "AI Reading" tab of the rail | `<ReadingPanel placement="rail">` |
| `full.reading` | "AI Reading" tab of the full sheet or S2 | `<ReadingPanel placement="full">` |
| `sheet.reading` | <1100, S2 with no ● selected after "Go to the Reading" (M11) | `<ReadingPanel placement="full">` |
| `pill.reading` | ≥1100 in Explore and 1100–1439 in Mission (M11), top left | `<ReadingPill openSignal={ui.readingRequest}>` |

**Interface:**
- `ReadingPanel({ data, placement })` and `ReadingPill({ data })`.
- `LKTRON_ENABLED: boolean`.
- `interpretWithLktron(request, signal?): Promise<LktronResult<MissionInterpretation>>`.
- Type `LktronResult<T>`.

**Consumes:**
- `useMission`: `scoring`, `profile` and `interpretation`.
- `useUi(missionPhase)`: when the phase is `analysis`, it builds `evidence-packet/1` (FNV-1a 64), validates each `ai-analysis/1` event (§5.5), and ends with `setMissionPhase('done')`, even if there are only facts.
- `buildMetricViews` from `metrics`.
- `sensitivity` from `engine`, for robustness with a mission profile.
- `OrbitLoader` from `boot`.

**Contracts:** `domain/aiContracts.ts` (`checkEvidencePacket`, `checkAiAnalysisEvent`, `checkMissionInterpretation`).

---

## 3. Shared state: who writes what

| Field | Writes | Reads |
|---|---|---|
| `ui.mode` | shell (tabs), composer ("/", Refine) | all |
| `ui.selection` | shell, places, globe (via `onSelect`), composer (preview of #1) | all |
| `ui.hoverSiteId` | places | globe |
| `ui.activeCriterionId` / `previewCriterionId` | metrics, analysis | leaders, metrics, analysis |
| `ui.stageInsets` / `ui.obstacles` | **shell only**, upon settling | leaders, globe (via props) |
| `ui.missionPhase` | composer (`idle → interpreting → profile → scoring → analysis`, `error`, `cancelled`), analysis (`analysis → done`) | composer, places, analysis, boot |
| `ui.introPhase` | boot | globe |
| `ui.cameraTouchedAt` | globe (`touchCamera`), composer (`resetCameraTouch`) | composer |
| `ui.readingRequest` | composer ("Go to the Reading", `uiActions.requestReading()`, which also sets `mode: 'mision'`) | shell (surface according to `readingRoute`), analysis (pill) |
| `missionStore` (`state/mission.ts`) | **composer only** (including `geologyCatalog`, M10) | places, metrics, leaders, globe, analysis, printable report |
| `composerStore.geology` · `useGeology` · `geologyExportError` | mission controller; the Reading checkbox writes `useGeology` (`setUseGeology`) | "Your mission", Reading |
| `AppData.geology` (M9 geological context, optional) | **only `App.tsx`** (deferred chunk `loadAppGeology`) | card ("Geology", Metrics, Sources); the shell registers it in the controller (`registerMissionGeology`) |
| `stageBridge` (per frame) | **globe only** | leaders |

---

## 4. Shared files: only the integrator edits them

If a feature needs a change here, it requests it in its handoff.

| Area | Files |
|---|---|
| Shell | `App.tsx`, `main.tsx`, `styles.css` and `shell/**`: `AppShell`, `RightRail`, `ModeTabs`, `Tabs`, `LiveRegion`, `announce`, `appData`, `public`, `layout`, `stageGeometry.js/.d.ts`, `shell.css`, `tokens.css`, `glyphs`, `placeLabel`, `useReducedMotion`, `useViewportLayout`, `sheet/**`, `detail/**` |
| State | `state/store.ts`, `state/ui.ts`, `state/mission.ts` |
| Domain and contracts | `domain/contracts.ts`, `domain/aiContracts.ts`, `domain/formatting.ts`, `domain/scoring.ts`, `domain/marsReference.ts`, `domain/surfaceSeries.ts`, `domain/validators*.generated.*`, `scripts/build-validators.mjs` (+ `--check` in the build), `contracts/*.schema.json`, `tests/fixtures/contracts/**`, `tests/test_ai_contracts.py` |
| Data | `data/loadDemoSnapshot.ts`, `data/loadVisualContext.ts`, `data/loadBasemaps.ts` |
| Existing content | `components/**` (Signal, Compare, satellite context) and `liquid/**` |
| Shell tests | `tests/featureContracts.test.ts`, `tests/shell.test.tsx`, `tests/uiStore.test.ts`, `tests/resolveDetent.test.ts`, `tests/reducedMotion.test.ts`, `tests/aiContracts.test.ts`, `tests/validators.test.ts`, `tests/snapshot.test.ts`, `tests/basemaps.test.ts`, `tests/surfaceSeries.test.ts`, `tests/visualContext.test.tsx` |
| Configuration | `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `vercel.json`, `scripts/**` |
| Documentation | `docs/**` (including the ADRs), `project/**`, `README.md`, `CLAUDE.md`, `AGENTS.md` |
| Artifacts | `artifacts/science-v2/**` and `submission/**`: **nobody regenerates them** |

---

## 5. Shell slot map

```
┌ topbar ─ brand · ModeTabs (Explore|Mission) · [topbar.status → boot.StatusChip] ─────┐
│ fixed scientific notice                                                               │
├──────────────┬────────────────────────────────────────────────┬──────────────────────┤
│ ≥1440 Mission │  stage → globe.MapStage                         │ rail (≥1100, with    │
│ left-panel   │  stage.overlay → leaders.LeaderLayer,           │ selection)           │
│ left.mission │                 boot.BootLayer                  │  rail.metrics        │
│ left.reading │  stage.hud (hudSlot) → leaders.LeaderToggle     │  rail.reading (1100– │
│              │  pill.reading (Explore) → analysis.ReadingPill  │  1439, tab)          │
│              │                                                 │  rail.reference      │
│              ├─ dock (≥1100) ──────────────────────────────────┤  «View sheet → 520»: │
│              │  dock.places → places.PlaceRail                 │  full.metrics ·      │
│              │  dock.composer → composer.Composer              │  full.reading · Signal│
└──────────────┴─────────────────────────────────────────────────┴  Compare · Method · │
                                                                    Sources           │
<1100: one sheet (#mode-panel)                                                          │
  S0 → sheet.tray.places + sheet.tray.composer                                            │
  S1 → sheet.s1 (metrics) · sheet.head (composer «✦ Refine») · sheet.list with no selection  │
  S2 → full sheet: full.metrics · full.reading · full.mission (Mission) · full.geology · Signal…       │
```

Each wrapper carries `data-slot="<name>"` in the DOM, for tests and QA. The full card (520 px rail and S2) adds the "Geology" tab (`full.geology`, the team's official M9 geological context) after "Origin".

---

## 6. Suggested integration order

1. `engine`: pure, no UI; unblocks parity.
2. `places`, `globe`, `metrics` and `boot`, in any order: they touch disjoint folders.
3. `leaders`: consumes `globe` and `metrics`.
4. `analysis` and `composer`: consume `engine`, `boot.OrbitLoader` and `metrics`.

The integrator merges each branch into `feature/mision-redesign`. At each step it runs `npm run test`, `npm run build`, pytest and browser verification, and updates `project/STATUS.md`.
