# features/analysis · Reading

Reading has three layers that always remain separate (ADR-013, `docs/INTEGRATION_PLAN.md` §5):

1. **Result:** the team's `MissionEvaluation` (`shared/mission`, ADR-009), labeled as a deterministic calculation under mission-rules-1.0.0, with v3 similarity left unchanged.
2. **Highlighted reasons:** the team's `composeExplanation`. By default it uses the deterministic template without AI (no ✦). When the user requests highlighted reasons with AI, the reducer validates Anthropic's selection using fingerprints and `checkSelection`. AI selects IDs only: every displayed fact and value is resolved against the evaluation (`explanationToReading.ts`).
3. **Snapshot facts:** deterministic facts (`facts.ts`): direction relative to Jezero, limiting criterion, saturation, shared regional value, lack of differentiation, best of N (excluding REF), and ranking robustness from `analysis-summary.json` (`domain/sensitivity.ts`, `robustness.ts`).

Go to Reading (M11) opens this surface from Your mission. In Mission at widths from 1100 to 1439 px, the Reading pill hosts it (`openSignal`). Below 1100 px, the sheet uses the profile's Reading tab or the `sheet.reading` slot. The view heading can receive focus (`tabIndex=-1`).

Explore does not use AI: it shows a deterministic reading. There are no automatic AI calls. The AI button goes through the mission controller (`features/composer/missionController.ts`).

| File | Chunk | Responsibility |
|---|---|---|
| `index.ts`, `ReadingPanel.tsx`, `ReadingPill.tsx` | Main | Stable interface and wrappers, including the skeleton and disclosure |
| `deferred.ts`, `ReadingView.tsx` | Deferred | Three-layer view |
| `facts.ts`, `types.ts` | Deferred | Snapshot facts without an evidence package or fingerprint |
| `robustness.ts` | Deferred | Compares rankings against pipeline sensitivity results |
| `explanationToReading.ts` | Deferred | Pure adapters: `explanationToReading`, `readingKey`, `snippetFor`, `evidenceHref` |

Removed during integration with dev: the lktron channel (NDJSON, `{{id}}` tokens, event gate, and package FNV fingerprint) and pre-generated prose (ADR-012, superseded by ADR-009 §7–9).
