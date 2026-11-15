# ADR-017 — EN | ES selector: Spanish as a presentation-only layer over English records

- Status: **proposed** (base implemented on `feature/es-selector`; areas pending, see `docs/I18N.md` §7).
- Date: 2026-11-15
- Relation: compatible with and subordinate to ADR-016 (English by default, versioned records, display-only translation layer). It does not change any scientific rule, score, threshold, candidate, dataset, artifact, record version, contract or export format.

## Context

ADR-016 made English the source and default language: new mission records are 1.1.0, geology wrappers version 2 and per-site geology exports version 2, all with English authored text; the frozen Spanish packs (1.0.0 / version 1) exist only to rebuild historical records. The product owner now wants the platform to stay English by default while offering a selector that lets a reader use it in Spanish.

Two tempting shortcuts are ruled out by ADR-016:

1. Producing Spanish records (1.0.0 / version 1) when the interface is Spanish would make the exported JSON and its fingerprints depend on the interface language, and would revive a version that is meant for historical reconstruction only.
2. Translating the Spanish source evidence into Spanish is unnecessary: it already is Spanish. Running it through the English display map in a Spanish interface would show English glosses to a Spanish reader.

## Decision

English remains the source language, the default language and the only language of new records. Spanish is a layer that only changes what is **shown**.

1. **Interface text.** UI strings come from typed catalogs per area (`apps/web/src/i18n/messages/*.ts`, `defineMessages`). The English entry is the current product text verbatim; the Spanish entry is the wording the product used at the same place before ADR-016 (git `273e5f8`) or the reviewed translation from the `feature/i18n` branch. Key and shape parity between both languages is enforced at compile time; placeholder parity by test.
2. **Record text.** Text that comes from the deterministic engine (reasons, scale notes, limits, ordering rule, scope notes, status definitions, verification instructions, notices, geology limits and guidance) is shown in Spanish by mapping the English record wording to the frozen Spanish pack wording of the same fact (`displayRecordText`). The record is never rebuilt, mutated or re-fingerprinted for display. The mapping is proven with the engine as oracle: for representative requests, every text of a 1.1.0 / version 2 record maps exactly to the text the engine writes with the 1.0.0 / version 1 packs. Unrecognized text (user input, source evidence, IDs) is returned unchanged.
3. **Scientific source text.** In English, artifact text keeps going through `sourceText`/`geologyGloss` as today. In Spanish, the original wording is shown directly: no English rendering, no gloss and no “original Spanish wording” mark.
4. **Exports and records are language-independent.** New records and downloads stay 1.1.0 / wrapper 2 / per-site 2, English, and are byte-for-byte identical whichever interface language is active. Historical versions keep validating and rebuilding exactly.
5. **Numbers.** Interface numbers use the language's format (en-US / es-CL) through `i18n/format.ts`. Exports, fingerprints, record text and AI payloads never use these formatters.
6. **AI.** Requests that make the model write text (the draft operation) accept an optional `language: 'en' | 'es'`, validated in `shared/mission/aiSchemas.ts` and on the server; absent means `'en'` and the current behavior is unchanged. With `'es'` the model writes activity, labels, details and open questions in Spanish. `source_quote` stays a literal substring of the brief, the server keeps verifying quotes and numbers, the model still produces no figures and no ordering, and explanations and geology keep returning IDs only. The client sends the field only when the interface is Spanish, so an older server never receives an unknown field from an English interface.
7. **Language choice.** Priority `?lang=en|es` > `localStorage['analogos:lang']` > English. A minimal inline script in the static `<head>` sets `<html lang>` before the first frame and the static shell is translated before React. The selector is an accessible EN | ES toggle group in the top bar.
8. **No new dependencies, offline first.** The i18n layer is hand-written (no npm package) and every catalog is bundled; no translation service is called at runtime.

## Consequences

- Fingerprints, exports, contracts, schemas and record versions are unaffected by the selector; the existing English tests keep passing with the default language.
- A change to an English pack sentence, or a new template in a pack, must keep its Spanish twin in the frozen pack's wording style; `i18n/recordText.test.ts` fails if a 1.1.0 text no longer maps to the engine's 1.0.0 wording. Because 1.0.0 is frozen, a genuinely new English record sentence without a Spanish twin is shown in English in the Spanish interface until a display mapping is added (never translated on the fly).
- Spanish AI drafts put Spanish labels and activity into the user's request; they are the user's confirmed content, exported verbatim like any user-entered text (the 1.1.0 `language` disclosure already states that user text keeps its wording).
- The interface now carries two catalogs; the initial chunk grows by a few KB (measured in `docs/I18N.md` §10). Area catalogs travel in their own deferred chunks.
- A stale client/server pair is handled: an English client never sends `language`; a Spanish client against a server without the field gets the existing `bad_request` path and can retry in English.
