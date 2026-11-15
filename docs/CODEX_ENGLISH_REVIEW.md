# English-default release review — Codex

Status: **completed and verified in production**. Date: 2026-11-15.

## Authorized scope

Dan requested an English root README and a complete Spanish version, then explicitly expanded the request to the entire repository: application, reports, technical documentation, internal coordination and historical narrative. `README.es.md` is retained. Explicitly Spanish submission variants keep their language and gain English counterparts and links.

Codex leads acceptance and release. Claude implements assigned code phases. Codex owns the concurrent Markdown translations and independent validation. The pre-existing untracked `outputs/` directory is outside this work.

## Baseline

- Branch `dev`, synchronized to `273e5f8`, including the team's already-published mobile-list and similarity-color changes.
- Independent baseline: `PATH="$PWD/.venv/bin:$PATH" npm run verify`, log `/tmp/analogos-english-baseline.log`: 333 Python / 805 web passed, 3 opt-in web tests skipped, server types and build passed.
- Protected scientific artifacts, historical evidence and release assets captured in `/tmp/analogos-english-protected.json` before code changes: 77 files.

## Phase A accepted: compatible English records

Claude completed versioned text packs and explicit version pairing. Codex reviewed dispatch, structural/semantic validation and the tests, then independently ran the full suite:

```bash
PATH="$PWD/.venv/bin:$PATH" npm run verify
```

Log: `/tmp/analogos-english-phase-a-codex-verify.log`. Result: **335 Python / 868 web passed**, 3 opt-in web tests skipped; server typecheck, web typecheck and build passed. All 77 protected files still match their original byte hashes.

The review covered:

- All ten historical exported records validate with and without the trusted snapshot. Historical evaluations and wrappers reconstruct identically.
- Pre-change hashes for twelve representative requests preserve the legacy evaluations, exports, geology catalogs, guidance and explanations. All seven per-site geological exports also remain reproducible.
- English records preserve statuses, ranks, numerical observations, geometry, evidence IDs, geological references and deterministic selection. The language change does not change scientific scores, weights or thresholds.
- Mixed or unsupported versions, relabeled records and substantive tampering are rejected. Legacy source records are not silently reinterpreted.
- English per-site geological export v2 has a separate golden fixture and TypeScript/Python parity. Python's legacy default remains available for reproducibility.

New mission evaluations and exports use 1.1.0; the geology wrapper and per-site exports use version 2. Legacy mission 1.0.0 and geology version 1 retain their frozen wording and formatting. The geological source package itself stays version 1. The ranking rules version does not change.

## Language and evidence boundaries

The original scientific artifacts, source quotations, official names, stable identifiers, user-authored input and historical exported evidence are not rewritten. New reports identify source text that retains its original language. The application and PDF use English editorial presentation; translations of official descriptions must be labeled and keep the original available.

Historical Markdown narratives are translated for readability. Their recorded checks, dates, results, commands, paths, hashes and limitations remain historical evidence, not new verification. Existing Spanish submission variants remain explicitly labeled alternatives; English is the default presentation path.

## Documentation and source prose

Codex translated the Markdown documentation, including internal/historical narratives and agent coordination rules, preserving paths, commands, hashes and recorded facts. English pitch/demo counterparts are available, and the current submission page now describes the integrated geological layer accurately. Original-source proper names and explicitly Spanish variants remain recognizable.

Python comments and docstrings were translated in 32 tracked files. For the automated portion, each change was checked against the original executable Python AST with docstrings removed, and files were applied only if their source hash still matched. The small remaining policy file was translated manually with the same AST check. No numerical expression, output string, identifier, threshold or executable branch changed in that pass. Runtime diagnostics/help and frozen source literals are handled separately.

## Phase B review and real-provider evidence

Claude reported 335 Python / 894 web passed (3 opt-in skipped), types/build, protected hashes and diff-check passing. Codex reviewed rendered source translation and AI handling, then tested the actual local application at 1440×900.

- AR6 selection, Metrics and Geology; English geological glosses with separately disclosed official originals.
- A synthetic English brief produced four unconfirmed English requirements from Anthropic: regional median slope ≤9°, non-vegetated fraction ≥95%, and pending traction/geological reconnaissance preferences.
- Explicit confirmation and evaluation retained only AR6, prioritized for reconnaissance with partial comparison. No field suitability was claimed.
- Real AI explanation with geology selected three official references, without changing the evaluation.
- The browser-downloaded `submission/evidence/english/local-ar6-live-export.json` validates and reconstructs to identical canonical content against the trusted science/geology packages (wrapper 2 / mission 1.1.0). The brief is synthetic demonstration input, not an actual campaign.
- A second real-provider draft used a synthetic Spanish brief. Activity, three requirement labels and open questions were English; all `source_quote` values remained exact Spanish substrings and every requirement remained unconfirmed. Evidence: `submission/evidence/english/local-spanish-brief-english-draft.json`.
- Manual example at 390×844: three requirements, seven windows, four candidates prioritized; visible 44px Reading action, English result and Reading sheet, Escape preserving the result. At 1280×800 the Reading pill opened the same result. These are emulated browser dimensions, not physical-phone tests.
- Review findings returned to Claude: original-language fallback incorrectly marking English/user text, translation applied to generated verification instructions, a Spanish Metrics footer and Reading loading accessibility label, decimal-comma source resolution, and a distributor's descriptive suffix. Phase C includes these corrections; Phase B is not yet accepted as a release.

Codex also applied comment translations to 219 TS/JS files after source-hash and executable AST equality checks, and 23 CSS/example files after exact equality of non-comment content. Concurrently modified files were skipped and assigned to Claude for completion.

## Final implementation acceptance

Codex independently ran `PATH="$PWD/.venv/bin:$PATH" npm run verify` after Claude's handoff. Log: `/tmp/analogos-english-final-codex-verify.log`. **335 Python and 898 web tests passed**, three opt-in web tests skipped; server/web typechecks, generated-validator check and production build passed. The build's nine snapshot tests are a repeated subset, not nine additional server tests. No tests were removed or weakened. `git diff --check` passed.

Reviewed corrections: source translation is now selected by provenance, not guessed from user text; generated verification instructions stay intact. The actual full Metrics view now displays its English quality note, source resolution reads `0.0003°`, and the place counter reads `1 matches a sector`. The final source-map tests cover all exposed active artifact strings; rendered tests exercise full/rail/sheet Metrics, Reading loading, reports with/without geology and mixed-language user labels. Official source names remain original.

The code prose pass includes test titles, comments/docstrings, CLI help/errors, schema annotations and workflow step messages. Python structural comparison found only translated string placement outside the explicitly reviewed export-version implementation. Numerical operations, dependencies, source configuration and scientific artifacts remain unchanged. The workflow's existing top-level name is kept as a compatibility identifier. ADR-016 is accepted.

Documentation check: 76 Markdown files and 66 relative links, no missing targets. Both README versions are complete and cross-linked. English pitch and demo variants are the default submission links. Preexisting `outputs/` remains excluded.

The downloaded local real-AI export was validated and rebuilt again after Phase C. All 77 protected files matched before intentional replacement of the current portable archive; the historical archive, scientific artifacts and historical exported records remain unchanged.

## Print and browser verification limits

Desktop and mobile UI, manual evaluation, Reading navigation, real Anthropic draft/explanation/geology and downloaded export reconstruction were exercised as described above. Native Chrome print preview displayed a 13-page English seven-window report with geological descriptions and provenance. The final full PDF was not saved and visually inspected page by page in this release: repeated native-window focus interruptions prevented completing that step. The previous M11 all-page PDF evidence remains historical, not a claim of a new English PDF audit. Print layout behavior is unchanged; current full report content is covered by rendered tests with and without geology. Physical iOS and deliberate GIBS network failure remain untested.

## Portable archive

The regenerated current archive has 74 entries and 14,891,807 bytes. CRC passed and a second packaging produced identical bytes. SHA-256: `86a157e08416a3d1b0ea3e1129c9a45f73e850e464b943936d9cb2e2077e6d19`. The historical v2 archive is unchanged.

## Publication gates

Regenerate/check the portable archive, publish dev, verify deployed English UI and real AI with geology, then promote main and replace the README screenshot from actual English production. Record deployment evidence here and in STATUS. No new field validation, worldwide coverage or suitability guarantee is claimed.

## Deployed checks and final mobile copy correction

Code `18b14eb` deployed successfully: dev Actions `43722897516`, production Actions `43723439158`. Dev retains its existing Vercel authentication; testing used the authorized signed-in browser, with no protection changes. The dev UI produced four English requirements, explicit confirmation, only AR6 evaluated and three geological references. `submission/evidence/english/dev-live-export.json` was downloaded, validated and rebuilt identically against the trusted bundle/context.

Production's real endpoint returned an English three-requirement draft for the shorter synthetic brief and an AR6 explanation with three geological references for the already-confirmed four-requirement reference request. Its request/evaluation fingerprints match the local trusted export. Evidence: `submission/evidence/english/production-live-smoke.json`. No key is in the client or evidence.

Final deployed mobile inspection at 390×844 found three overlooked display strings: the Refine button, its pending label and the metric counter. Codex translated them, corrected the existing assertion and added coverage for the pending state and the actual rendered sheet counter. **41 relevant tests and build passed** after the correction (`/tmp/analogos-english-mobile-final-tests.log`, `/tmp/analogos-english-mobile-final-build.log`). Five remaining test-description fragments were also translated without changing their assertions. The full suite's earlier 898 web count precedes the one additional focused regression test. This patch changes no API, calculation, data or contract; its updated archive was packaged twice with identical bytes and clean CRC.

## Final publication accepted

- Final deployed code: `fab8ed9d03f7cce54c90308f93eeffa5b3779543`, fast-forwarded through dev and main without force.
- Dev Actions [43723813882](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43723813882) and production Actions [43724021553](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43724021553) succeeded, including the isolated packaged-function startup check.
- Final dev and production mobile views show **Refine** and **5 of 7**. Production was checked at 390×844 in the in-app browser; screenshot `submission/evidence/english/production-mobile.png`. This remains an emulated viewport, not physical iOS validation.
- `submission/assets/analogos-production.jpg` was captured from the actual English production after deployment (2055×1147, normal browser size) and replaces the README screenshot. No mockup is used.
- The final mobile patch leaves `server/`, `api/`, `shared/`, `contracts/`, configuration, source artifacts, deployment settings and dependencies identical to the real-provider-tested `18b14eb`.
- The final documentation/evidence/screenshot checkpoint uses `[skip ci]`: it does not alter deployed code. Both branches are synchronized. Claude has no new assignment; implementation continues on dev only under a new authorized task.

The language migration is accepted. The native-PDF, physical-device and network-failure QA limits stated above remain explicit; this release does not claim those additional checks were completed.
