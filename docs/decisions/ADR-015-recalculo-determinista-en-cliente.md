# ADR-015 — Deterministic client-side recalculation for mission profiles

- Status: **superseded by ADR-009** (guided team recommendation: confirmed requirements, `evaluateMission` and v3 similarity without recalculation; forbids re-weighting). It is not integrated; it is kept as a record of the discarded decision. Previously: proposed (2026-11-14), numbered ADR-009 on the redesign branch and ADR-011 until the M9/M10 merge (2026-11-15), where ADR-011 belongs to the team.
- Date: 2026-11-14 (supersession: 2026-11-14, ADR-013)

> **Superseded.** When integrating with dev (ADR-013), `features/engine` (port of
> `aggregate`, levels, mission weights, predefined profiles, DEMO matching) and its parity test with
> `pipelines/scoring.py` were removed. Mission no longer calculates any %: it shows the status, the ranking position of
> the evaluation, the preferences met and the v3 similarity as is. The following text is
> kept unchanged as a record.
- Relation: `docs/UX_REDESIGN.md` §3.2, §5.1, §5.6 and §7.1 (increment 8). It does not modify the P0 profile or the v2 snapshot: the recalculations are “according to your profile” views, labeled `needs_calibration`.

## Context

In Mission mode the user describes a test (“autonomous navigation on rocky terrain”) and wants to see the sectors ranked for that objective. The v2 snapshot provides, per sector and criterion, the normalized similarity (`normalized_similarity`) and the data quality, calculated by `pipelines/scoring.py`. Re-ranking with other weights requires aggregating again; doing so in a backend would break the “no backend” and “no external APIs in the core flow” rules.

## Decision

1. **Levels → weights**: each criterion receives a level Key 3 / Important 2 / Minor 1 / Exclude 0. The weight is level ÷ sum of levels. It is calculated by the client (`features/engine`), never by the AI.
2. **TypeScript port of `aggregate()`** (and of `sensitivity()` if feasible) with numerical parity against `pipelines/scoring.py` (tolerance ≤1e-6) verified by tests with the real snapshot. Weighted geometric mean with ε and minimum valid weight (`minimum_valid_weight` of the base profile, 0,70). Similarity and confidence remain separate numbers; feasibility is not recalculated.
3. **Inputs**: only `normalized_similarity`, `quality` and `status` per criterion from the snapshot. Per-criterion similarities and planetary ranges are not recalculated.
4. **Coverage**: a requested criterion without data (e.g. geology) remains “to be calculated” and reduces coverage; if coverage falls below 0,70, “Insufficient data for this profile” is shown instead of the %.
5. **Labels**: every mission result says “% from the deterministic engine vX · your profile · not the snapshot” and the profile is marked `needs_calibration`.
6. **Ordering** with `rankCandidates` (descending similarity, nulls last, tie-break by `site_id`).

## Consequences

- Mission works offline (predefined profiles + DEMO keyword matcher).
- There are two implementations of the aggregation; the parity test is mandatory and blocks the build if it diverges.
- **If not approved**: only profiles precalculated by the pipeline; the AI or the matcher chooses among them and weight editing is disabled with “to be calculated”.
