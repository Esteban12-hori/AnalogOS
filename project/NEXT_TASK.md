# ENGLISH-DEFAULT — completed assignment

- **Owner:** Codex
- **Status:** completed — accepted and published to dev/main by Codex. Final code `fab8ed9`; dev Actions `43723813882` and production `43724021553` succeeded. English UI, real AI, exports and screenshot verified. See `docs/CODEX_ENGLISH_REVIEW.md` for evidence and explicit QA limits. Claude has no new assignment.
- **Branch:** dev; base `273e5f8` (the team has already published its mobile list/color fixes to dev and main).
- **User authorization:** Dan first requested an English root README and a complete Spanish version. He then explicitly expanded this to ALL the repository: application, reports, technical guides, internal/historical documents, while retaining `README.es.md`.
- **Lead/reviewer/release:** Codex. Claude implements and returns review; no commit/push/merge/deploy, no branch changes, no subagents. No secrets, .env, credential files, external browsing or browser tools. Preserve preexisting untracked `outputs/`.

All phase instructions below are historical. Do not restart them or infer a new assignment.

## Codex review of B and authorization of C (historical)

Phase B has passed Claude's verification but is not accepted yet. Codex's live 1440px browser review found concrete gaps in `/tmp/analogos-english-phase-b-review-notes.md`; read that file and fix every finding before acceptance. In particular, do not infer that English or user-authored text is Spanish; apply source translation only to field-check provenance, not generated verification sentences. Include regressions for the exact examples and render the affected Metrics and Reading loading surfaces. Real Anthropic draft and explanation/geology worked in Codex's local browser: four English requirements, confirmed AR6, three geological references; downloaded evidence remains for Codex validation.

Then complete Phase C, translation only:
- Remaining authored comments, docstrings and test descriptions in TS/JS/Python; CLI help and diagnostics; schema titles/descriptions; workflow step labels/comments and example config commentary. Translate runtime diagnostics together with their assertions where necessary. Preserve every test's intent; do not delete tests or weaken validators.
- Codex has already applied comment-only translations to 219 TS/JS files after exact source-hash and executable AST equality checks, and 23 CSS/.env.example files with identical non-comment content. Preserve these authorized edits. The 23 TS files that changed during B were skipped; list in `/tmp/analogos-english-ts-comments-applied.json`. Python prose was already translated. Do not redo the bulk documentation. Only remaining prose needs attention.
- Keep frozen Spanish version packs, historical export/evidence JSON, scientific artifacts, source configuration prose that affects reproduced artifacts, original official citations/names, stable keys/enums/IDs/URLs and deliberately multilingual test input strings unchanged. Add clear English comments for frozen output literals where needed. Schema annotation translation must not alter constraints; fix outdated wrapper description to explain both supported versions accurately. Regenerate compiled validators only through the existing script if necessary.
- No new dependencies, datasets, scores, algorithms or feature scope. No secrets, .env, external network/browser, subagents, commits/push/merge/deploy or branch changes. Preserve unrelated outputs/ and Codex Markdown work. Codex handles browser/PDF/live provider and release.
- Expand ADR-016's exceptions and update ENGLISH_PROGRESS. Run full verify, diff-check, protected hashes and report a bounded inventory of remaining Spanish (each intentional category). Return Owner Codex / review. Do not claim universal UI coverage merely from a heuristic scan; tests must cover the actual affected rendered views.

## Codex acceptance of A and authorization of Phase B (previous checkpoint)

Codex independently ran the full suite: `/tmp/analogos-english-phase-a-codex-verify.log`, **335 Python / 868 web passed, 3 opt-in skipped**, types/build passed. Reviewed version dispatch, schema pairing, all ten historical export reconstruction cases, legacy golden capture, science invariance and semantic tamper checks. All 77 protected evidence/artifact files remain byte-identical. Phase A is accepted as the compatibility foundation; this is not release acceptance.

Implement the full human-facing Phase B now. Preserve the text packs and strict historical validation. English is the default for UI/accessibility/errors/empty/loading states, number/date formatting, example briefs, print/PDF, mission/geology guidance and all newly generated AI prose. Change UI-facing exports/constants to English while keeping legacy reconstruction explicitly bound to its frozen pack. Diagnostic errors must accurately describe both supported versions (do not translate obsolete “only contract 1.0” wording literally).

- **Dynamic data:** give editorial text from active science/visual/geology/reference artifacts English display translations through a pure display layer. Do not mutate any artifact or the objects supplied to the engine/validators. English must reach Reading, criteria details, limits, field checks, sources and PrintContent, including mixed `snapshotScaleNote` strings. Add coverage and no-mutation tests. Source originals and stable codes remain intact in audit JSON.
- **Official source wording:** keep official place/unit/source names and citations recognizable. For long Spanish geological descriptions shown to readers, provide a faithful, explicitly labeled English editorial translation/gloss with the original available separately (for example a disclosure). Do not leave the main geology view as long untranslated Spanish paragraphs merely labeled as Spanish. Do not invent mineralogy or simplify away source limitations. Frozen original source records remain in the JSON; report language disclosures explain this. If using source-keyed translation maps, include coverage tests against every exposed active record and deterministic fallback clearly marked as original wording, never silently fabricate a translation.
- **AI:** translate system instructions/purpose definitions/retry messages. All generated activity/labels/questions/warnings in English even for a Spanish brief; source_quote must remain an exact literal substring of the user's brief. Keep structured IDs-only explanations/geology and the one bounded retry. Extend English topic recognition where needed, preserving existing Spanish input support. Meaningful mocked tests for both English and Spanish briefs, not merely matching a system prompt string. Codex will test the real provider later.
- **Reports:** PDF and the human-authored parts of new JSON reports in English; raw source JSON downloads clearly labeled as source records. Keep all evidence/source/provenance/limits, exact current result linkage and old export compatibility. No re-acquisition, new scores, new dependencies or altered requirements.
- **Concurrent Python prose:** Codex translated comments/docstrings in tracked Python files and verified that the executable AST is unchanged after removing docstrings. These are authorized parallel changes; preserve them. Runtime diagnostic/help strings and frozen artifact literals were not translated by that pass; they remain for Phase C.
- **Document ownership:** the concurrent Markdown translations are CODEx's work, authorized by Dan. Codex has translated nearly all docs, agent instructions, internal/historical notes, and prepared English pitch/demo variants; preserve these changes. Root READMEs and submission docs remain Codex-owned. Do not translate those files again. You may create a new `docs/decisions/ADR-016-english-default-and-export-compatibility.md` explaining the approved architecture and boundaries (status proposed until overall review), and update only `project/ENGLISH_PROGRESS.md` and the Owner/Status handoff in NEXT_TASK. Leave STATUS/CHANGELOG for Codex while their historical text is being translated. Later Phase C will cover remaining code comments/help and leftover doc code blocks, not retranslate whole documents.
- Run meaningful English render tests with real v3/geology data, manual/no-API and mission paths, print with/without geology and all legacy-version tests. Run full verify, diff-check, protected hashes. No actual browser/network/provider calls from Claude. Codex does browser/mobile/native PDF/real AI, packaging and release. No commit, push, merge, branch changes, additional agents or credentials. Return Owner Codex / review.

## Plan checkpoint

Read AGENTS.md, CLAUDE.md, STATUS, latest CHANGELOG and relevant ADRs. Inspect localization needs and propose a practical plan. Do not edit yet. Particularly resolve scientific integrity: existing artifacts, source quotations, filenames, stable IDs/enums, historical exports and their fingerprints must remain valid. A language change must not silently invalidate previous mission/geology exports or change science/rankings. Identify where Spanish strings enter UI, PDF, exports, deterministic results and AI prompts. Recommend the smallest compatible approach and exact files/verification. Review all tracked textual areas including Python pipelines/scripts/config/test descriptions/comments, Markdown internal/historical docs, metadata/HTML/manifest/SVG and build-generated content, not only JSX. Distinguish editorial prose (translate) from original external evidence and stable identifiers (preserve).

## Codex plan approval — Phase A authorized

Plan read at `/tmp/analogos-english-claude/plans/read-project-next-task-md-you-are-fluffy-shamir.md`. Implement Phase A now, then stop for review. Decisions:

- Explicit compatible contract evolution is approved: mission evaluation/export 1.1.0 default English alongside frozen 1.0.0; wrapper v2 alongside v1; enforce matching versions in both structural and semantic validators. Keep rules_version and actual math/order unchanged. Reject unsupported or mixed versions; never silently reinterpret. Unknown version at public builders must also fail, not silently choose English.
- Per-site geology: use explicit English export schema_version 2 alongside historical 1 (context/package still version 1). Preserve legacy metadata exactly when reconstructing v1 wrappers; thread the selected text version into subset builders. Do not overwrite the existing golden fixture. Add an English fixture and Python/TS parity for both. Python builders should preserve their legacy default if needed for scientific reproducibility, with an explicit English option; UI/builders for new user reports default English. Do not change generation of stored geology artifacts.
- Preserve legacy formatter behavior VERBATIM, including existing Intl behavior where used; do not improve rounding/grouping while extracting frozen packs. English formatting must retain precision and the <0.1 / >99.9 coverage boundaries.
- Exports: English authored metadata/interpretation plus explicit original-source disclosure is sufficient. Do not add an unchecked translations field. Source evidence remains verbatim, including historical Spanish, under the existing strict integrity checks. English display/PDF resource follows in Phase B. Both source language and editorial translation will be clearly distinguished.
- Add all ten historical exports to meaningful reconstruction/validation checks with and without the trusted bundle; compare new English vs legacy results for statuses, ranks, metrics, geometries, evidence IDs, purpose/ref sets. Prove mixed/unknown versions and substantive tampering remain rejected. Capture representative legacy outputs BEFORE editing. Include unsupported objective, empty priorities, point/bbox no coverage and AR6 geology, not only a happy path.
- Preserve schema discriminators, enum/status values and IDs, paths/hashes, numeric thresholds, request confirmation, old AI records and canonical source quotes. English prompt activity/labels etc come in B; user quotes remain exact.
- Baseline already completed by Codex: `/tmp/analogos-english-baseline.log`, 333 Python / 805 web passed, 3 opt-in skipped, types/build passed. Prior plan's 799 web count is stale. Protected evidence hash manifest: `/tmp/analogos-english-protected.json`; extend with config and research evidence if useful. README.md and README.es.md are completed by Codex; preserve them until a final wording check.
- Later C/D: translate every internal/history document and authored code prose, preserving original quotes/evidence. For Spanish-named submission pitch/demo files create complete English `_EN.md` versions and make English the default links. Preserve explicitly Spanish `_ES.md` counterparts with language links and make their exception visible. Do not publish a file named `_ES.md` whose content was silently changed to English. English source titles/proper names should not be fabricated.
- Only after Codex accepts A proceed with B, then C/D. No commit/push/deploy. Do not read .env or credential files. No additional subagents. Record results in an English `project/ENGLISH_PROGRESS.md`; current Owner Claude until A returned, then Owner Codex / review. Codex owns README files and independent QA. You own the assigned Phase A files only now.

## Required result after plan acceptance

1. English default throughout human-facing UI, accessibility, loading/error/empty states, forms, dates/numbers, geology and reference catalogs, print/PDF and AI-generated prose. User-entered text remains as authored. UI has no Spanish demo/default prompts. Offline/manual flow remains complete.
2. Root README fully English, complete `README.es.md` preserved, reciprocal language links; linked technical guides now English. Natural precise copy, no claim of worldwide coverage or field validation. Translate tracked prose docs including coordination/history, preserving facts, hashes, commands, paths and scientific caveats; no reclassifying historical evidence as fresh validation. Original quoted evidence may retain its source language, labeled clearly.
3. English human-readable exports without altering factual evidence, IDs, numerics, geometry, weights or requirements. Existing export formats and fingerprint reconstruction must remain compatible. Propose explicit versioning/locale strategy if required, not accidental hash drift or weaker validators.
4. No package/dependency additions, no scientific re-acquisition, no changing candidate selection/scores. Preserve artifact bytes and historical evidence by default. New display localization resources are allowed after review. Pipeline authored prose/comments may be translated but output reproducibility constraints require careful separation.
5. Update meaningful tests for English visible output, both AI operations, print/geology and dynamic artifact-origin text; preserve historical export validation. Full `PATH="$PWD/.venv/bin:$PATH" npm run verify`, `git diff --check`; readme/doc link check. Codex independently reviews, exercises browser/mobile/PDF/real AI, regenerates portable release and supervises publication per user workflow.
6. Document exact changed surfaces and unavoidable original-language source/identifier exceptions honestly. Handoff Owner Codex / review. Existing `README.es.md` was created by Codex from current README and is within scope; other local outputs are not.

---

## Previous assignment, closed

# M11 — Direct access to Reading and printable report

- **Task ID:** M11-READING-PRINT
- **Owner:** Codex
- **Status:** accepted — completed, published to dev/main and verified in production by Codex. Code e5e9139; dev Actions 43686593750 and production 43686863876 passed. Real AR6 AI and export validated. Evidence: docs/CODEX_M11_REVIEW.md. Claude has no new assignment.
  - `verify`: 333 Python, 798 web and 3 skipped; build passed.
  - Claude's initial delivery via SSR/CSS; Codex later completed browser and native PDF. See the M11 review.
  - **Round 2 (Claude):** “Go to Reading” was moved from the export to the summary of the compact result, after `pl-lead` and before chips and groups. Single action, minimum 44 px. Web 799 pass and 3 skipped; build passed. Python was not rerun.
  - **Round 3 (Claude):** only changes the printed criteria table. It receives the class `pl-criteria-table` and, in `@media print`, a fixed layout with columns at 18/15/13/20/18/16 %. Words are only broken if they do not fit; links and code do break. No changes to text, font, screen or the other tables. Web 799 pass and 3 skipped; build successful. Codex generates the new PDF.
- **Base:** dev `ce86a879905cb927d9881aae6ab564d9082f39fc`.
- **Direction, review and acceptance:** Codex. Dan asks to delegate to Claude, supervise and review everything before pushing to dev. Claude does not commit, push, merge, deploy or switch branches. Codex will publish dev after acceptance. **Later extension from Dan:** review everything and then promote to main/production; this promotion is exclusively Codex's responsibility after validating dev. Claude is still not authorized to publish.

## First checkpoint: read-only

Read AGENTS.md, CLAUDE.md, this block, STATUS, CHANGELOG and ADR-013/014. Confirm branch and diff; the assignment changes are Codex's and `outputs/` is unrelated. Inspect the code and return a brief plan with files, findings and tests. Wait for Codex's approval before editing. No subagents. Do not read credentials or .env; no external browser tools. Codex will perform the actual browser and PDF checks through its controlled environment.

## Round 3 — legibility of the actual PDF

Codex obtained and reviewed the 12 pages of `submission/evidence/m11-seven-sectors-print.pdf`; there is now complete content through provenance/fingerprints. Visual finding: the criteria table assigns very little width to “Requisito” and “Observado”: “Mediana de pendiente regional” and “Observado” are split into fragments of 2–4 letters, while Escala takes up ~36%. Fix ONLY the printed presentation of that table, without changing data or screen. Give it its own class (e.g. pl-criteria-table) and a fixed layout with balanced widths for the six columns (reference: 16/16/12/18/22/16 %; adjust with judgment), keeping links that break, repeated header and rows without clipping. Do not limit/hide texts or reduce the font to make it fit. Do not affect the five-column confirmed requirements table or the three-column Measures table. Related tests/build; do not add tests that only look for CSS strings. Leave it in review. Codex will generate and verify a new PDF; the PDF added by Codex is provisional evidence and you must not modify it.

## Round 2 — Codex usability finding

Navigation and focus verified in Chrome 390×844, 1280×800 and 1440×900; also with no selection, Back and Escape. **Fix before accepting:** “Go to Reading” sits next to Export, after the whole list. At 390×844, the seven-sector example places the button at y=1470 and it is only 34 px tall: it is not found in the first view of the result. Move ONE single action next to the initial summary of the compact result (after pl-lead and before chips/groups), with a minimum height of 44 px and adequate margin; keep the text and behavior. Do not duplicate it or present it as an export. Add a lightweight regression for single presence and order before the alternatives groups; Codex will visually verify actual visibility. Keep the rest of the reviewed delivery; no changes to science, AI, server or routes. Affected tests and build; document the round and return to Owner Codex / Status review. There is no need to repeat Python for this move. Codex fixes the task's own trailing whitespace and does the final verify.

## Plan approved by Codex (2026-11-15)

Claude's plan reviewed. Reusing the Reading pill for Mission in 1100–1439, while keeping the selection is approved; the Your mission CTA may set Mission mode. On mobile, keep a single sheet and scope even when there is no selection or it is ◆. Prioritize a small solution; focus retries bounded and cancelable, no new focus trap. Navigating does not query the AI or mutate the planner. Keep access when changing width without selection jumps.

**Printing:** Codex reproduced and obtained a native one-page PDF (`/tmp/analogos-m11-baseline.pdf`, seven sectors), cut off after geometry: results, geology and sources are missing. Fix resets/pagination and complete PrintGeology with the same evidence as the screen. Do not add a different generated explanation: the report already includes the full deterministic reasons and provenance; keep that scope.

**Plan adjustment:** avoid printing automatically after an asynchronous wait. Prefer a disabled button “Preparing report…” until the current report is mounted and a synchronous click to print. Ctrl+P during loading/without a result must show a notice, never an old report. No print queues that could fire for another mission after editing. Tests for initial load, invalidation and no catalog. Only one source of truth for validity.

Implementing the plan with these adjustments, tests and documentation is authorized. Claude leaves it in review; Codex will review browser/PDF and release. No commits/push, do not change main, no new dependencies, do not edit science/server. Dan's new goal is to review the whole set and then publish main/production; Codex will do it after testing dev.

## Expected outcome

1. “Go to Reading” is a visible and working action from the compact result / Your mission. On mobile it opens the sheet and the Reading tab; at 1100–1439 it opens the appropriate surface and at ≥1440 it focuses the left panel. It must work with no site selected, with a reference selection, with an evaluation without prioritized candidates and after a width change. Do not change selection, brief, requirements, geometry, ranking or start AI by navigating. Closing/going back preserves the state and the focus is accessible. Do not create another engine or redesign the interface.
2. Review and fix printing of the integrated report, including PrintGeology. A single current report, complete, legible on a white background, without globe/dock/controls or clipping due to 100dvh/overflow. Pagination of long reports, tables and links; geological content and evidence limits intact, never turning regional cartography into suitability. It must work the same without geology. Do not print an outdated report when editing or an empty page due to deferred loading.

## Scope and limits

Minimal changes are allowed in shell, UI state, composer/analysis features and presentation planner components, CSS and associated tests. Preserve shared contracts, science, server, AI, data, dependencies, CI and README screenshots. Do not modify artifacts/, shared/, server/, api/, .github/, vercel.json or secrets. Do not regenerate scientific data. Codex will regenerate the ZIP after the final review if applicable. Do not modify outputs/ or historical evidence.

The navigation result does not depend on a selected alternative nor inherit data from another geometry. Preserve Yungay REF and the manual flow without AI. An accessible route and a lightweight UI action are preferable to duplicating planner states. If printing requires waiting for render, preserve user activation and show a clear state; do not launch printing automatically on evaluation.

## Tests and delivery

- Add meaningful regressions for preserved navigation and selection/scope; no tests that only look for code strings.
- Verify the report with/without geology, long text, several sectors, references/sources, invalidated result and initial load. Distinguish SSR/CSS from an actual PDF: do not claim native verification if it did not occur.
- Run related tests, types/build and `PATH="$PWD/.venv/bin:$PATH" npm run verify` (save the log outside the repo; report a summary). No real AI tests or external consumption are needed for these presentation improvements.
- Update STATUS/CHANGELOG and UX/contracts documentation if the UI channel changes; record commands, limits and files. Leave this block with **Owner Codex / Status review**. Do not self-approve.
- Codex will review the diff, repeat the relevant tests and check 390×844, 1280×800 and 1440×900, keyboard, route to Reading and actual PDF with geology before publishing dev.

---

# README for the new interface and promotion to production — Codex (2026-11-15)

- **Owner:** Codex. **Status:** accepted; completed, published and verified. **Base:** `dev` `513c44a`; production `origin/main` `437b515`, ancestor of dev.
- **Direct authorization from Dan:** “update the README now that it has a new interface and let's move everything to main, the push to master so it goes to prod”. The repository deploys production from `main`; `master` does not exist.
- Update the README with Explore/Mission, current screenshot and public link. Promote the complete reviewed delivery to `main`, without force. Configure the AI in the production runtime through the existing GitHub secret, as in dev; verify build, function and the actual published flow.
- Preserve scientific data, acceptance limits and unrelated `outputs/`. Record the result and synchronize continuity. Does not assign work to Claude.
- This task replaces the restriction on not publishing main from the previous review; the following blocks are background.
- **Delivery:** main/dev `7e8c779`, production Actions `43682694089` and dev `43682693561` successful. README screenshot taken after publishing; real production AI and export verified. See `docs/PRODUCTION_RELEASE.md`. Later checkpoint documentation/evidence only with `[skip ci]`; both branches synchronized. No new assignment to Claude.

---

# Review of the published integration — Codex (2026-11-15)

- **Owner:** Codex. **Status:** accepted; completed, published and verified with real AI. **Branch/base:** `dev`, `dd625b4`. **Delivery:** `9c183fb`, Actions `43681551867` successful.
- Dan delivered Gus's handoff to continue the integration already merged and deployed. Verify real AI (draft, explanation and AR6 geology), decide the treatment of Yungay in Mission, review ADR-013/014 and fix the reference in CLAUDE.md.
- Fix regressions found in this walkthrough, verify and publish to dev under the current authorization. Do not modify the scientific core or main. No new assignment to Claude.
- Finding reproduced and fixed: “Evaluar este sector” → text in the dock → “Enviar” now preserves the chosen route and geometry. Regression test and local walkthrough successful.
- Result: real AR6 AI verified, ADR-013/014 accepted, Yungay kept as a known alternative in Mission and separated from discovery. See `docs/CODEX_INTEGRATION_REVIEW.md`; there is no new assignment to Claude.
- Final retest after publication: the sector is preserved; real draft and explanation/geology correct; final export validated/rebuilt. Evidence: `submission/evidence/integration-final-dev-geology-export.json`.
- The following blocks are background; the pending push described there was already completed in `dd625b4` (Actions 43678787020).

---

# Direct user decision — integration of the redesign with dev (2026-11-14)

- **Request:** the user asked Claude Code directly “merge into dev and push” and decided to integrate: the interface is that of the redesign (`feature/mision-redesign`, ADR-010, now ADR-014) and internally the deterministic planner, Anthropic's AI and the team's v3 data are used (ADR-008, ADR-009). Recorded in ADR-013 and `docs/INTEGRATION_PLAN.md`.
- **Scope executed in `feature/mision-redesign`:** non-squash merge of `origin/dev` (`92392f1`), adaptation of the features, removal of the in-house engine and the lktron channel, renumbering of ADRs (then 010–013; now 012–015) and documentation. No changes to `shared/`, `server/`, `api/`, scientific artifacts, M8 contracts or CI.
- **Pending:** the push to `dev` is a separate step authorized by the user; acceptance of ADR-014 (formerly ADR-010) and ADR-013 is up to the human team. Codex's M10 task below remains accepted and is not modified.
- **Merge of M9/M10 (2026-11-15):** `origin/dev` `d2252b6` merged without squash into `feature/mision-redesign`. The M9/M10 UI was ported to the integrated interface: “Geología” tab of the sheet, geological orientation in “Your mission”, and checkbox and retry in the Reading. Everything from the team remains intact. The own ADRs 010/011 become 014/015. Details in `docs/INTEGRATION_PLAN.md` §11 and `project/STATUS.md`.

---

# M10 — Test recommendation with geological evidence and AI

> Later documentation maintenance: [product README](tasks/README_PRODUCT.md), handled by Codex at Dan's request. It does not reopen M10 or assign work to Claude.

- **Task ID:** M10-GEOLOGY-AI
- **Owner:** Codex
- **Status:** accepted — completed, published and verified on dev by Codex
- **Branch:** dev
- **Base commit:** bdbdab0603be6745993e1689f6dcec960d766c9e
- **Direction, review and acceptance:** Codex. Dan authorized: "let's make the AI use this geological data to improve the recommendations. Give the next task to Claude and you supervise and review everything before pushing it to dev". Codex will publish dev after accepting. Claude does not commit/push/deploy. Main untouched.

## Mandatory initial checkpoint

Read AGENTS, CLAUDE, STATUS, the latest CHANGELOG, ADR-009/010, GEOLOGY_CONTEXT, the M8 AI/export/UI core and M9. Confirm branch/HEAD and Codex's assignment changes. **Read-only:** return a concrete plan covering files, geological selection contract, validation and fingerprint, optional server/Vercel loading, compatible export migration, and tests. Wait for Codex's approval before editing. No subagents. Work in a bounded vertical slice.

## Product outcome

After a test is defined and confirmed, or one of the evaluated sectors is chosen, the AI explanation uses the official M9 geological units to highlight evidence relevant to that test and to guide field reconnaissance/validation. The screen shows which unit/document supports each suggestion, what limitations apply, and what remains to be verified. The AI must actually receive the confirmed objective and the geological context, and its selection must change reasonably between different objectives. Merely attaching the JSON or creating an identical generic block for everything is not enough.

Keep the deterministic requirements result and the geological guidance separate. Do not change rankings, score, confidence, weights, measured criteria or profiles: regional mapping does not prove traction, soil mechanics, Martian equivalence, safety or permits. Coverage is not suitability/accuracy; absence does not mean geology does not exist. A discarded sector is not rehabilitated by its geology. Yungay remains REF. Full-window geology is not inherited by a point/sub-polygon or other geometry.

## Authorized scope

1. Reuse the real M9 geological artifact without modifying it. Factors: original units, description and code, fractions without double counting, gaps/ambiguity/missing description, authority, scale, unknown map date, source and limits. A minimal refactor of the pure M9 validator/types into shared/geology with a web re-export is permitted; the server must NOT import apps/web (avoid M8's ERR_REQUIRE_ESM). Single strict validation, not a weakened copy.
2. The server loads the validated official package, binding it to the exact candidates/snapshot. Never trust geodata or free IDs sent by the client. Optional loading, when absent/invalid, preserves M8; treat a divergent presence/version with a controlled stale-context error. Propose and verify actual inclusion of the file in the Vercel function, packaged startup, and optional absence; bounded changes to vercel.json/startup script are authorized if necessary. Do not change secrets, authentication, providers or workflow without demonstrated need.
3. Extend the Anthropic explanation with a closed schema of valid references per sector, unit/source and verification purpose. Prefer selection of facts and cited editorial questions; do not allow free factual prose that invents lithology. The AI may prioritize guidance according to the brief; inferences/questions must be labeled as such, not as measurements. Include genuine units and sufficient context, not just IDs. Data and brief are treated as data, not instructions. Validate membership, uniqueness, limits, correspondence with selection/scope, and status. Do not offer calibrated geological compatibility or introduce fictitious measured requirements.
4. Bind the response to the request/evaluation fingerprint and the exact geological package. Reject a selection from another version, another sector/unit/source, late responses after editing/changing scope or changing context. Preserve cancellation and M8 states. Optional without data/AI: deterministic factual context and questions with an honest label, manual flow intact. The AI does not invent units in a sector without coverage nor assert details inside gaps/overlaps.
5. UI integrated into the planner/results, clear Spanish, contrast/size >=12px in new content, mobile 390px/keyboard. Useful summary of geological guidance for the test; expandable detail/sources if voluminous. Essential limits/gaps always visible even if the AI omits them. Update the text on what is sent to the provider (now also the objective and public geology). Explain source, scale and relation to the test without confusing ranking/suitability.
6. Self-describing reproducible export with the geological evidence actually used, sources, limitations, AI selection, context identity and provenance. Propose an explicit/versioned evolution or compatible wrapper: existing M8 1.0 exports must continue to validate and be reconstructed; do not add silent fields to the old contract. Verify reconstruction and rejection of tampering/stale data. M9's own export continues. The portable static package works without a server, no keys in the bundle.
7. No new infrastructure/dependency except where justified at the checkpoint, no new countries/data/maps/score. Do not regenerate science/geology/visuals. Protected baseline /tmp/analogos-m10-baseline-hashes.json (do not alter it to pass). M9 history in project/tasks/M9_GEOLOGY_CONTEXT.md. Modifications to the AI core/shared/contracts/UI necessary for M10 are authorized; evaluation/geometry/catalog are protected.

## Acceptance

- Meaningful tests: real CL/AR evidence (partial/0/100), foreign unit, old/absent/invalid package, fingerprint/edit/late response, geometry scope, prompt injection as data, no promotion of discarded sectors nor score; selection related to the objective and exact citations; fallback without AI; old and new exports/tamper. Two real opt-in tests with contrasting objectives, without assuming exact LLM stability.
- source .venv/bin/activate && npm run verify; repeated release:package identical; git diff --check; baseline intact; compatible packaged function. Codex will perform an independent review, real AI, and desktop/mobile/offline/download browser checks, then dev.
- ADR-011 proposed, operations/AI/science/export documentation, project/M10_PROGRESS.md, STATUS/CHANGELOG and reproducible commands. Do not overstate coverage or scientific validation.
- On delivery: Owner Codex / Status review; report real results and gaps, do not self-accept or publish. Preserve Codex's assignment and documents.

## Checkpoint review and implementation authorization — Codex

Plan reviewed. I authorize implementation after reading the specific files below and confirming git status/HEAD; Bash is available in this call. Correct these points of the plan:

- **Partial sectors DO have known units**: do not remove their references because they have gaps. Show units of the covered area with the gap/overlap limits always visible, without locating units in the gap. If a window is chosen for a point/bbox, only full-window context explicitly labeled as such; never evidence attributed to the small geometry. Without a chosen window, emit no units.
- **Purposes useful for the test**: besides resolving gaps/ambiguity, include bounded editorial questions on surface-material characterization for mobility (grain size/compaction/friction to be measured, never inferred), recognition of lithological diversity for sampling/instrumentation, and verification of map-terrain correspondence. The AI must choose valid unit+purpose pairs according to the objective; merely prioritizing identical gaps is not enough. Do not classify materials automatically by keywords or introduce new metrics. Purposes about gaps are only admitted if there are gaps, etc. Up to 3 references per sector and 12 overall, with no obligation to fill the quota; if it needs more it must justify. No free factual text.
- Identity: use the SHA256 of the COMPLETE canonical JSON of the validated context with shared/mission/fingerprint.ts (already implemented); name it context_fingerprint, do not present it as a byte hash. Also check the candidates_sha256 of the original bytes on the server. Identity bound to the existing request/evaluation; do not invent an absent policy_version.
- **Recommended compatibility**: keep the M8 selection/record/schema/export 1.0 intact, add an opt-in geological channel to explain (optional client fingerprint field and separate geological result). The UI stores the geological record separately but from the same call/provenance. Without opt-in it preserves M8. New wrapper with its own kind/version and embedded M8 mission 1.0 + geological context/evidence/selection and provenance. Separate wrapper constructor/validator, explicit format acceptance. Do not rewrite M8 validators/exporters unnecessarily. The wrapper must be auditable without external artifacts (include the full validated context or a validatable subset with declared package identity and without claiming to be able to verify the hash of the omitted remainder).
- Optional loading: absent or invalid yields an unavailable state for geology, does not break M8. If the client believes it has a valid context and the server has a different one/none, a specific error before calling the provider and an explicit option to retry M8 without geology (do not hide the degradation). An absent client may use M8 even if the server does have data.
- Bounded includeFiles authorized; a packaged-function test without keys/network must EXERCISE that the geology is included and validated, in addition to the existing GET 405/POST 503. It is not enough for the endpoint to start and never read the file because it has no key. Test absence in isolation without damaging the bundle/repo.

Confirmed paths: docs/decisions/ADR-009-mission-guided-recommendation.md; project/CHANGELOG.md; server/ai/{operations,prompts,facts,handler,nodeAdapter,anthropic,config}.ts; shared/mission/{types,aiSchemas,explanation,exportReport,validate,fingerprint}.ts; apps/web/src/mission/{aiClient,plannerState}.ts; apps/web/src/components/planner/{usePlanner,PlannerPanel,ResultView}.tsx/ts; apps/web/src/App.tsx; apps/web/src/domain/geologyContext.ts; apps/web/src/data/loadGeologyContext.ts; scripts/check-vercel-function.mjs; vercel.json; contracts/mission-{ai,export,request}.schema.json.

The full slice and local checks are authorized; no commit/push/deploy. If the call budget runs out, leave a clear checkpoint of what is done and pending. When finished, Owner Codex / review. Keep original evidence and data intact; update texts that said the AI does not consume geology.


## Codex's return — corrections needed before accepting

Apply docs/CODEX_M10_REVIEW.md. Exact reproduction of three confirmed failures: node /tmp/analogos-m10-independent-review.mjs, results in /tmp/analogos-m10-independent-results.json. Today all mutations produce [] and that is incorrect even with the official bundle. Close the consistency of geometry/citations/full subset and embedded M8 with regression tests. Enriching the catalog/fingerprints/new contract and audit helpers is authorized, without changing old contracts or artifacts. Do not accept scientific integrity on the basis of a hash that does not include all the facts used/exported. The wrapper constructor must validate the context against the bundle/candidates in an appropriate way, not assume that TypeScript proves provenance.

Also close the clickable source/printed URL, fractions without ambiguity, and clarification of overlaps; avoid rounding facts to 0/1 in the prompt. Clean implementation texts (M8) from the UI and make the conditional sending notice coherent; place AI activation before the long cards. Review the other edge cases in the report: you already fixed the explicit root; keep that fix and verify real isolation of the startup check. Consider bundle identity in the cache to avoid reusing context with changed candidates.

Rerun the relevant tests and then verify once, redirected to a log to preserve counts without repeating for lack of output. Repeat the ZIP after final changes; original baseline + supplement from HEAD in /tmp/analogos-m10-additional-protected.json. The real AI already demonstrated a difference; if you change the prompt/schema, run the two final queries and keep the responses/objectives/selections/provenance without keys in an evidence file for audit, not just counts. No subagents/commit/push. Return Owner Codex/review. Codex does the browser and dev release.

## Codex's local acceptance

Review and corrections closed; see docs/CODEX_M10_REVIEW.md. Claude is left with no new assignment. Codex publishes dev and checks the remote function and AI before final closure. Do not start new changes.

## Codex's remote return — 2026-11-14

M10 was published in 1ac15e3 (Actions 43664952053), real function validated. Two queries of the same AR6 case in dev returned ai_invalid_output. Exact local reproduction /tmp/analogos-m10-debug-live.mjs: M8 valid, geology rejected for more than 3 references for one sector; the provider response in /tmp/analogos-m10-dev-repro-provider.json is synthetic/public only. DO NOT raise limits or silently trim the response.

Implement bounded recovery: only for an explanation with a geological channel and a semantically invalid selection, a single second call with the same facts/schema and a precise reminder of the caps/IDs. Do not resend free provider text; use a fixed message or typed/controlled reasons. Revalidate the entire M8+geology output; if it fails again, return the existing error and keep the fallback intact. Do not retry timeout/refusal/rate-limit/truncation or M8 without geology. Preserve the configured TOTAL deadline for the operation (the second call uses the remaining time, it does not duplicate 20s), the provenance of the finally accepted response, and do not log secrets/user bodies. Document that the consumption of a second call does not appear aggregated in the provenance of the final response; better to add evidence only in tests, not change the public M8 contract.

Reinforcing the prompt with an effective budget of min(12,3*eligible sectors) is authorized, including a per-sector limit. Do not use maxItems: Anthropic's official documentation limits arrays and requires post-validation (https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

Proportional tests: first response 4 valid AR6 IDs -> second3 valid; invalid second -> rejection; foreign/duplicate IDs are not accepted; no change in evaluation; no M8 retry/upstream errors; remaining deadline; second provenance returned. Run the AI/geology tests, typecheck/build and the synthetic real AR6 case, saving evidence without private data. Do not rewrite science/shared/mission/artifacts/contracts/UI. ZIP does not change if only the server changes. Update progress and return Owner Codex/status review. No commit/push/deploy/subagents.

## Acceptance of round 3 by Codex

Reviewed the diff, the one-retry limit, shared deadline, final provenance, full post-validation and tests. 316 Python/332 web correct. Integrity repros and historical exports continue to validate correctly; 33 protected files intact. Codex publishes this fix and verifies dev. Claude has no new assignment.

## Final closure by Codex

Code 4708b42b4bd152dca74d3e009f233a910e458d8b; Actions 43665786554 correct. Real geological AI in dev and the downloaded export verified against the official data. See docs/DEV_AI_VERIFICATION.md and docs/CODEX_M10_REVIEW.md. Claude has no new task; main preserved for this delivery.
