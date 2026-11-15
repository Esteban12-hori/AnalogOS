# ADR-013 — The redesign interface hosts the planner, the v3 data and the team's AI

- Status: **accepted by Codex (2026-11-15)**, under the direction and review delegated by Dan. Integration published in `dev` (`dd625b4`) and real Anthropic verified from the UI; evidence and limits in `docs/CODEX_INTEGRATION_REVIEW.md`. The human team retains final authority.
- Date: 2026-11-14
- Authorization: the user directly asked "merge into dev and push" and decided to integrate: the UI is that of the redesign (ADR-014, formerly ADR-010) and internally the team's deterministic engine, AI and data are used.
- Relationship: applies ADR-008 (v3 discovery pilot) and ADR-009 (guided recommendation) without changing them. Supersedes ADR-015, formerly ADR-011 (client-side recalculation by weights) and ADR-012 (lktron).

## Context

Two lines of work advanced in parallel from `adcffcd`:

- **Redesign (this branch):** fixed stage with globe and transition to 2D, ●◆○ markers, carousel, Tesla lines, metrics rail, composer, Reading and mobile sheet (ADR-014), with its own engine that re-weighted the 7 criteria (ADR-015) and an optional AI via NDJSON (ADR-012).
- **Team (`origin/dev`):** Chile–Argentina v3 scientific snapshot with reproducible search and Yungay as a reference (ADR-008), and a planner with confirmed requirements, deterministic evaluation, JSON export and Anthropic AI on the server (ADR-009), already deployed and verified.

Keeping both engines would show two orderings and two "similarities" for the same place, and ADR-009 (accepted) forbids re-weighting.

## Decision

1. **The redesign UI hosts the team's planner.** "Your mission" mounts the team's pieces (`RequirementEditor`, `ScopePicker`, `ConfirmSummary`, compact `ResultView`) through `PlannerView`, which is separated from `PlannerPanel` without changing its signature or behavior. A single controller (deferred chunk) uses `plannerReducer`, `buildRequest`, `evaluateMission`, `composeExplanation`, `buildMissionExport` and the AI client unchanged over an external store: the dock, "Your mission", the carousel, the globe, the rail, the lines and the Reading read the same state in the same render. `usePlanner` is kept intact for `PlannerPanel`.
2. **Precompiled validators in the main chunk; runtime Ajv only in the mission chunk.** The web validates the snapshot with validators generated from the same schemas and with the same messages as `shared/domain/contracts.ts`; the v3 search and background go in a separate chunk that the loader imports only with v3. `shared/` and `server/` do not change and import nothing from `apps/web`.
3. **The Reading combines three separate layers:** the result of `MissionEvaluation` ("Deterministic calculation"), the highlighted reasons (a deterministic template without ✦ or, if the user requests it, the Anthropic selection validated by the reducer) and the snapshot facts. The AI only contributes IDs; all text and every figure is resolved against the evaluation.
4. **There are no automatic calls to the AI.** Only two explicit buttons, each with the team's literal sending notice: "Propose requirements with AI" (the draft arrives unconfirmed) and "Highlight reasons with AI" (only with `outcome === 'evaluated'`). "Send" in the dock never calls the AI. Without a key, without a network or from the ZIP, the manual path works completely and the buttons say "not available".
5. **The flow without AI requires manual requirements.** Without AI there is no deterministic conversion from free text to thresholds, and creating one would break "nothing invented". The flow "I write and see results" becomes "I write, add requirements or use the example, confirm and evaluate"; "Use example" is one click away and the suggested requirements arrive without a value.

## Consequences

- Mission no longer computes a "mission %": it shows status, rank (prioritized only), preferences met, v3 similarity/confidence/stability without recalculation and "Territorial feasibility: pending". The weights of the rail and the lines are always those of the snapshot; the requirements layer (✓ ✕ ○) goes on top.
- Yungay (REF) is left out of the Explore ranking in the carousel, the globe, the rail, Compare and the Reading; a country filter keeps the global rank.
- **Acceptance decision on Mission:** `evaluateMission` is kept unchanged. In accordance with ADR-009 §5, Yungay may be prioritized as a known alternative if it meets the confirmed requirements. Its rank in Mission is that of the evaluated alternatives, always labeled REF; the candidate count excludes it and separately states "REF also prioritized". That rank is not a discovery nor the Explore ranking. Keeping the same order in the UI and the export avoids two incompatible results.
- Sending or editing the brief from the dock keeps the path and geometry already chosen; it only initializes "Define a test" when no path exists. Confirmation remains explicit.
- `features/engine`, the lktron channel, the pregenerated prose and the `mission-interpretation`, `evidence-packet` and `ai-analysis` contracts are removed, along with their validators, fixtures and tests (including the TS↔Python parity of the own engine). The ◆ catalog (`reference-analog`) is kept.
- Editing after evaluating invalidates the result (team reducer) and aborts the in-progress AI request; the previous result stays dimmed until re-evaluated. The local history moves to v2 (the user's brief, scope and requirements; never AI provenance nor results).
- The team's printable report is mounted once per page while a current evaluation exists.
- Risk: if the web bundle ceased to be identical to the server's, every AI explanation would end in "does not correspond to the current calculation". `bundleParity.test.ts` monitors this.

## Discarded alternatives

- Keeping the own engine alongside the team's: two orderings and two similarities; contradicts ADR-009.
- Using `usePlanner` inside a component and copying its state to a store: a one-render delay makes controlled fields lose characters.
- Validating the snapshot with runtime Ajv in the main chunk: more weight on the critical path with no benefit.
