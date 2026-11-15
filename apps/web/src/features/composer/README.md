# features/composer · composer and «Your mission»

Redesign layer on top of the team's planner (ADR-009 and ADR-013). A single controller
(`missionController.ts`, deferred chunk) uses `plannerReducer`, `buildRequest`,
`evaluateMission`, `composeExplanation`, `buildMissionExport` and the AI client (`mission/aiClient.ts`) unchanged
on top of an external store, and publishes to `state/mission.ts` (sole writer) and `ui.missionPhase`.

Flow:

1. **Send** (dock): opens «Your mission» in the «Define a test» path with the brief loaded.
   It never calls the AI.
2. **Requirements**: by hand, «Use example» or «✦ Propose requirements with AI» (explicit button, with the
   team's submission notice). The draft arrives unconfirmed.
3. **Confirm and evaluate** with the team's buttons. The evaluation is synchronous and deterministic.
4. **Result** in the carousel, the globe, the rail, the lines and the Reading; in «Your mission», the
   compact `ResultView` with «Go to the Reading» (M11, navigation only), «Download JSON», «Print
   report» and «Back to editing». «Print report» stays disabled («Preparing report…»)
   until `PrintContent` mounts the report for the current evaluation (`printState.ts`). Without a
   current evaluation, `MissionPrintHost` prints a notice instead of the report.

Editing after evaluating invalidates the result (team reducer) and aborts the in-flight request over the network;
previous results remain at `--o-busy` until re-evaluated.

| File | Chunk | What it does |
|---|---|---|
| `index.ts`, `Composer.tsx`, `MissionComposer.tsx`, `MissionCard.tsx`, `printHost.tsx` | main | Dock view and deferred links |
| `composerStore.ts`, `labels.ts`, `model.ts`, `focus.ts`, `popover.ts`, `runLoader.ts` | main | Private state, labels and wait thresholds (3 s, 10 s), result line |
| `missionController.ts`, `MissionPanel.tsx`, `ComposerExtras.tsx`, `PrintContent.tsx`, `history.ts` | deferred | Controller, «Your mission» (the team's PlannerView), suggestions, report, history v2 |

History (`analogos.composer.history.v2`): the user's brief, scope and requirements. Unmodified
AI proposals, their provenance and results are never saved.
