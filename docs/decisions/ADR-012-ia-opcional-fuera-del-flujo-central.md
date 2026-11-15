# ADR-012 — Optional AI (lktron) outside the core flow

- Status: **superseded by ADR-009 §7–9** (guided team recommendation: Anthropic only on the server, validated ID selection). It is not integrated; it is kept as a record of the discarded decision. Previously: proposed (2026-11-14), numbered ADR-010 on the redesign branch.
- Date: 2026-11-14 (supersession: 2026-11-14, ADR-013)
- Relation: `docs/UX_REDESIGN.md` §0.8–§0.9 and §5 (marked as superseded). It depended on ADR-015, formerly ADR-011 (also superseded).

> **Superseded.** When integrating with dev (ADR-013), the lktron client (NDJSON), the
> contracts `mission-interpretation`, `evidence-packet` and `ai-analysis`, the FNV fingerprint, the tokens
> `{{id}}`, the keyword matching "DEMO · no AI" and the pre-generated prose were removed. The AI is the
> team's: `server/ai` (Anthropic, key only on the server) called with `mission/aiClient.ts`,
> which proposes unconfirmed requirements or selects IDs from the evaluation; never figures or ordering.
> The following text is kept unchanged as a record.

## Context

Mission mode gains a lot if someone interprets the user's free text and writes a comparative reading. The project rules prohibit using AI to score, to mix similarity/confidence/feasibility, to invent figures, and to depend on external APIs in the core flow.

## Decision

1. **The AI never scores or produces figures.** It only (a) interprets the mission in 0–3 levels per criterion, assumptions and "what was requested without data" (`mission-interpretation/1`), and (b) writes text that cites facts with `{{id}}` markers (`ai-analysis/1`). Every figure, ordering and stance ("best of 3", "limiting", "saturates") is produced by the deterministic engine and travels in `evidence-packet/1`.
2. **Closed contracts** (`additionalProperties: false`): the schema has nowhere to put a %, a confidence or a ranking. Text without digits or % outside markers, ≤280 characters. Precompiled Ajv validators on the client.
3. **Validation before display** (§5.5): schema, FNV-1a fingerprint 64 of the package, each `{{id}}` exists and is in `refs`, no written numbers, consistent `fact_kind`, vocabulary filter ("safe", "suitable", "the best", "score"…). Whatever fails is discarded and a notice is shown; unvalidated text is never displayed.
4. **Outside the core flow**: without network or without an endpoint, the interpretation uses keyword matching labeled "DEMO · no AI" and the reading uses `artifacts/science-v2/ai-analysis.default.json` (pre-generated, labeled as non-scientific) only if its fingerprint matches; otherwise, only the layer of deterministic facts. lktron is enabled behind a build flag and its endpoint is configured without committing secrets.
5. **Fixed label** "✦ AI interpretation · interprets, does not score" and "Figures: engine · Wording: AI" on every surface with generated text.

## Consequences

- The core demo keeps working offline and without AI.
- Residual risk: a plausible but false sentence without figures. It is mitigated by the stance fixed by the engine, the vocabulary filter and the one-click checklist, and it is acknowledged in the UI.
- **If not approved**: Mission is left with only predefined profiles and the DEMO matcher; the Reading panel shows only deterministic facts.
