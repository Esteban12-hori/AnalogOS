# ADR-016 — English by default, with versioned records and a display-only translation layer

- Status: **accepted** by Codex after independent verification (ENGLISH-DEFAULT, Phases A–C, 2026-11-15). See `docs/CODEX_ENGLISH_REVIEW.md`.
- Date: 2026-11-15
- Relation: ADR-009 (mission recommendation and export 1.0), ADR-010/011 (geology context and geology wrapper), ADR-013 (integrated UI). It does not change any scientific rule, score, threshold, candidate, dataset or artifact.

## Context

Dan asked for English as the default language of the whole product: the UI, accessibility text, the printed report, the AI-generated text and the reports. Two parts of the system make this harder than a copy change.

1. **Fingerprinted records contain wording.** The deterministic evaluation writes human-readable text (reasons, scale notes, limits, ordering rule, scope notes, data-request note) into a record. That record is hashed, and audits rebuild it and require exact equality. Historical exports (mission 1.0.0, geology wrapper v1, per-site geology export v1) were produced with Spanish wording and must stay valid.
2. **Source evidence is in Spanish.** The science snapshot, visual context, geology package and reference analogs carry Spanish editorial text and official Spanish names and descriptions. These files are protected evidence: they are fingerprinted and must not change.

## Decision

1. **Explicit record versions (Phase A).**
   - Text packs (`shared/mission/text`, `shared/geology/text.ts`) supply every authored string and number format that enters a record.
   - Mission evaluation/export **1.0.0** uses the frozen Spanish pack and **1.1.0** the English pack. Geology wrapper **1** pairs with 1.0.0 and wrapper **2** with 1.1.0; per-site geology export **1** is Spanish and **2** is English.
   - New records default to the English versions.
   - Versions are enforced to pair, both structurally (schema `if/then`) and semantically (the wording must match the version).
   - Unknown or mixed versions are rejected in every public builder and validator. Nothing is reinterpreted, and nothing falls back silently.
   - Logic, thresholds, ordering and IDs do not depend on the version. Tests prove that statuses, ranks, metrics, geometry, evidence and geology reference sets are identical across versions.
2. **English UI-facing constants (Phase B).** UI exports such as labels, formatters, `LIMITS`, `STATUS_DEFINITIONS` and `PURPOSE_LABEL` now resolve to the English pack. Historical reconstruction stays bound to the frozen pack through the record version, never through these UI constants. Numbers and dates use en-US formatting. Coverage keeps its honest boundaries (`<0.1%`, `>99.9%`, `100%` only when exact).
3. **Display-only translation of source text (Phase B).**
   - `apps/web/src/i18n/sourceText.ts` maps each exact Spanish source string to an English display rendering.
   - `apps/web/src/i18n/geologyGloss.ts` holds labeled English editorial glosses for official unit names and descriptions.
   - Both are applied at render time only. Artifacts and the objects handed to the engine, validators and exports are never mutated, and audit JSON keeps the original wording.
   - Official names (authorities, distributors, dataset titles, place names, bibliographic titles) are kept verbatim. Spanish titles carry `lang="es"` and are labeled as original.
   - A long official description is shown as an English gloss, labeled "English editorial translation", with the original wording available next to it. On screen this is a disclosure; in print the original is shown inline.
   - Unknown text is never translated on the fly and its language is never guessed: it is shown unchanged and unmarked. The "original Spanish wording" mark and `lang="es"` are applied only where the source language is known (unit descriptions from the official layers, an explicit set of Spanish bibliographic titles).
   - Only source field checks (verification IDs `<site_id>|fc|<n>`) go through the display map. Instructions generated from a requirement (`<site_id>|req|…`) are versioned English text with the user's own label, and are rendered as authored.
   - Coverage tests fail if any exposed string in the active artifacts lacks a rendering, or if a gloss has no matching unit.
4. **AI.**
   - System prompts, purpose definitions and the bounded retry reminder are English.
   - The model is told to write activity, labels, details and open questions in English even for a Spanish brief.
   - `source_quote` must remain an exact substring of the brief in its original language. The server still verifies this, along with the literal numbers.
   - Unmeasured-topic recognition accepts English and Spanish briefs.
   - Explanations and the geology channel still return IDs only, with the same single bounded retry.
5. **Reports.**
   - The printed report and the authored parts of new JSON reports are English.
   - Reports disclose that copied source evidence keeps its original language: the `language` block in mission export 1.1.0, plus language notes in wrapper v2, geology export v2 and the printed report.
   - Raw source downloads are labeled as source records: the per-site geology JSON, the site record and the provenance indexes.
   - The default filenames of new downloads are English (`analogos-recommendation-*.json`). Stored artifact filenames do not change.

## Consequences

- All historical exports in `submission/evidence/` still validate and rebuild exactly, with and without the trusted bundle. Legacy outputs are pinned by hashes captured before the change (`tests/fixtures/mission-legacy-1.0.0-hashes.json`).
- A client and server deployed from different commits can disagree on the default record version. The existing stale-result path handles this.
- When a source artifact gets new or changed text, its English rendering must be added to the display map. The coverage test enforces this.
- Spanish remains where it is evidence or identity (bounded exceptions, Phase C inventory in `project/ENGLISH_PROGRESS.md`):
  - official names and titles, and source records in JSON;
  - user-entered text, and deliberately Spanish test inputs (briefs and labels that exercise bilingual parsing, Spanish source strings that exercise the display map, simulated upstream error bodies);
  - stable codes, keys and filesystem names (`cumple`, `priorizado_para_reconocimiento`, purpose IDs, `no_adquirido_en_M8`, the `?modo=`/`misión` URL value, `.previo` backup directories, stored artifact filenames);
  - frozen 1.0.0/v1 packs (`shared/mission/text/es*`, the version-1 section of `shared/geology/text.ts`, `EXPORT_DESCRIPTION`/`EXPORT_HOW_TO_READ` in `pipelines/geology_contract.py`), including their es-CL number format;
  - literals compared byte-for-byte with stored artifacts (the duplicated `GEOLOGY_POLICY` notes, `HISTORICAL_GEOLOGY_LIMITATION`, the fixture-name suffix `(sintético, ubicación arbitraria)`);
  - pipeline text that is written into artifacts: snapshot prose, `decision_reason` and rejection reasons, geology repair diagnostics, basemap and visual manifest notes, and the `config/` files that feed them. These are marked in code with `Frozen output text (Spanish)` comments. Rewording them would change regenerated artifacts, so it needs a new artifact version, not a translation pass;
  - historical records under `submission/evidence/` and quoted historical Spanish in project history;
  - the explicitly Spanish `README.es.md` and `*_ES.md` documents.
- Phase C translated authored code text only: comments, docstrings, test titles, CLI help, runtime diagnostics with their test assertions, schema `title`/`description` (constraints proven unchanged), the precompiled validator headers, and workflow step labels. Executable behavior is unchanged except for the wording of diagnostics.
