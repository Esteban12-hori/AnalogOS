# Current assignment — define a test or evaluate a sector

## Status

- **Task ID:** M8-MISSION-RECOMMENDATION
- **Owner:** Codex
- **Status:** accepted
- **Delivery:** published on dev and both Anthropic operations verified by Codex; see `docs/DEV_AI_VERIFICATION.md`. Code deployed `9060970`; Claude is awaiting a new assignment.
- **Subsequent evaluation, no new implementation:** Codex completed the requested analysis of official geology in `docs/GEOLOGY_FEASIBILITY.md`, with real measurements in `docs/research/geology/`. The first recommended cut is descriptive context (20–32 estimated h), without altering scores. This analysis does not change the accepted status of M8 nor assign work to Claude.
- **Branch:** dev
- **Base commit:** 4d197e17893dc4eef2dc5c9771c79813c909b657
- **Direction, oversight and acceptance:** Codex. Dan authorized this implementation on 2026-11-14 and chose Anthropic for the AI.
- M7 accepted, archived in project/tasks/M7_GLOBAL_DISCOVERY.md. The integrated version has globe, MapLibre, liquid glass, series and science v3: preserve the team's work.
- Claude's implementation did not authorize publication. After acceptance, Dan authorized Codex on 2026-11-14: "push it to dev and verify that the AI works there too". This enables commit/push, Anthropic configuration for dev and remote verification; not promotion to main.

## Product outcome

User: planetary robotics campaign lead in a laboratory, university or company. Decision: "For this test, which sector deserves reconnaissance, why, what rules it out, and what remains to be measured?".

Deliver two complete journeys, with real data and optional Anthropic assistance:

1. **Define a test:** describe the objective, review editable structured requirements, confirm them, compare options and export a reproducible recommendation.
2. **Evaluate a sector:** choose one of the seven areas with evidence or enter coordinates/bbox; check which geometry has data, apply the test and deliver an evaluation or an explicit insufficient-evidence report.

First supported scientific profile: Martian rover/Jezero. Outside coverage, the diagnosis and data request must be completed; do not fabricate a positive recommendation nor announce a live global search.

## Mandatory first checkpoint

Read AGENTS, CLAUDE, STATUS, ADR-001 to 009, PRODUCT_AND_SCIENCE, DATA_AND_SCORING and contracts. Confirm branch, HEAD and changes by others. Codex verified baseline: 177 Python, 69 web and build; hashes in /tmp/analogos-m8-baseline-hashes.json.

**Before editing the implementation, deliver a compact plan to Codex: files, requirements/states, spatial resolution, endpoint and tests. Wait for its feedback.** Inspecting and preparing the plan/ADR is permitted. No subagents or parallel sessions. While Claude implements, Codex reviews without editing its scope.

## 1. Experience

- Main entry "Define a test" / "Evaluate a sector", problem explanation and example. Preserve explorer, v3 search, comparison and method.
- Progressive flow accessible on desktop, mobile and keyboard, integrated into the existing design. Do not force going through long sheets to get started.
- Brief maximum 3000 characters, activity, destination/reference, requirements. Only one truly supported profile, with no fictitious profiles to fill selectors.
- Measurable requirements available: regional slope median (degrees), median roughness (m), relief (m), non-vegetated fraction (% or 0–1 with explicit conversion), full polygon area (~km²), countries. Each one: operator/range, unit, essential or preference. Show few at the start and more detail optionally.
- Maximum point slope of the rover, rock size, traction, loose soil, road, cost, permits, operating date, local rain and mobile coverage are not measured. Keep these requests as non-evaluable; do not silently reinterpret them as an available metric.
- A requirement stores origin user/AI, scale and confirmation. Show the unstructured parts of the brief as questions/pending items. User confirms/edits before evaluating; no constraint hidden or silently discarded.
- Changing brief/requirements/sector invalidates previous results. Cancel/ignore late responses by fingerprint or request ID. Do not mix two requests.
- Keep text when navigating back. Do not store briefs in logs/backend. Local persistence only if explained and deletion is allowed.

## 2. Verifiable engine

- Pure module and additive request/evaluation contracts. Science v2/v3 byte-for-byte intact; do not modify weights, tolerances, quality or scientific profiles.
- The AI does not choose weights/score/verdict. User requirements are conditions of their test, not NASA standards.
- Critical requirements first: observed failure => incompatible; missing/inadequate scale => insufficient evidence. A high score does not compensate for blockers or unknowns.
- Among options with evaluable critical requirements met, order by satisfied preferences and then v3 similarity, with stable tie-break by ID. Document the order. No new suitability percentage. Unknown preferences retain partial comparability, are not equivalent to zero and do not prove dominance.
- States: prioritized for reconnaissance, does not meet requirements, insufficient evidence, unsupported objective. Territorial feasibility independent and pending. Recommending none is valid.
- Per option: requirement, value/unit, meets/does not meet/not evaluable, reason, source/evidence_id and scale/period; original similarity/confidence labeled. Include limits, field verifications and what evidence would change the decision.
- Area is the extent of the polygon, not free hectares. SCL does not prove traction/mineralogy. Contextual POWER does not approve local rain nor forecasts.
- Yungay evaluable as a known alternative, reference role visible. Do not modify the M7 ranking nor apply its exclusion of precedents to the campaign selection problem.
- Validated JSON export with confirmed request, rules/versions, snapshot/profile, requested vs measured geometry, evaluation, evidence, limits and AI provenance when it exists. Readable printable report (print CSS is enough).

## 3. Geometry and coverage

- Select seven sectors from list/map/sheet with country and polygon visible. Coordinates and bbox as an accessible alternative; optional rectangle drawing without a new library if not necessary.
- Validate ranges, lon/lat order, finiteness, bbox and size. Point within area: "there is evidence for this window, not for the exact point", and explicit selection of that window before evaluating it. Resolve multiple matches.
- A subpolygon or partial coverage do NOT inherit aggregate metrics from the full polygon. Report missing coverage/evidence; offer to evaluate the full window only through explicit action.
- Outside the pilot: no sufficient evidence and an exportable request with bbox/requirements/planned sources. No nearest neighbor, fake loading or simulated satellite queries. No new acquisitions in M8.

## 4. Real and optional Anthropic

- Provider chosen by Dan. There is not yet a key at assignment; Codex prepares a secure local entry. Do not read/print secrets nor request them via chat. Only environment/ignored .env consumed by a program.
- Two operations: extract a draft from the brief and explain the computed evaluation. Context limited to the supplied catalog/evidence. No tools, shell, arbitrary browsing, free external data nor agents.
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` server-only; configurable and supported model (check docs/account). Fixed official host, no arbitrary URL from the client.
- JSON Schema and syntactic/semantic validation; handle refusal, truncated output, foreign citations/IDs, errors and timeout. Structured outputs does not support native citations: use validated evidence IDs and links supplied by the app.
- The server obtains facts/scores from versioned artifacts and the validated request, not from the browser. Reject foreign IDs/sources. The AI never changes the engine nor results. Show interpretation separate from metrics.
- Do not present narration that contradicts the blockers; it may select structured reasons/references so that the renderer preserves the facts. Deterministic fallback always labeled as such, without simulating AI.
- Minimal endpoint `api/` Vercel Node, separate testable logic and equivalent local server with Vite proxy. No DB or new login. No secret in VITE_, bundle, ZIP, prompt, response or log.
- POST/content type, body/brief size, timeout, bounded output tokens, explicit allowed local/preview origin, calls via button and blocking during a call, sanitized errors, basic rate protection documented as non-distributed. No open general generation.
- Explain next to the button that the text is sent to Anthropic. The manual path does not transmit data.
- Without key/offline/provider down: manual journey and recommendation work, AI unavailable. Never attribute a template or mock to real AI.
- To accept the real integration: one draft and one explanation with harmless inputs, record model/date/request ID/usage without secrets. If the key is missing, report the specific blocker, do not claim success through mocks.

## 5. Authorized technical scope

New decision/AI contracts/module, planner, App/map/sheets, API/local server/proxy, test scripts, `.env.example`, ADR-009, product/architecture/presentation documentation. Minimal dependencies justified at the checkpoint. Adapt the packager only with an explicit list of new assets; preserve controls.

Do not touch v2/v3 scientific data, science configs, raw data, credentials, Vercel protection/auth, deploy workflows, remotes nor unrelated redesign. No new regions, weights, scientific profiles, SAR, trained ML, private documents nor live sweeps.

This assignment explicitly authorizes the extension of the former "no AI/backend" rule. Manual portable ZIP; server/key documented separately. Do not promise offline AI nor AI available without a configured service.

## 6. Acceptance and delivery

1. Brief -> editable requirements -> confirmation -> recommendation/export; editing invalidates results. A measurable requirement changes the selection, an impossible critical requirement leaves zero; non-evaluable never approves.
2. Unsupported objectives, point-specific slope/traction and unknown preferences retain limits. Yungay is an evaluable reference, Chile/Argentina correct.
3. Existing sectors, point inside/outside, partial bbox/subpolygon, invalid coordinates and output without evidence; without transferring metrics to another geometry.
4. AI: real draft/explanation, no key, timeout, refusal, truncated JSON, invented IDs/citations, adversarial text and late responses. No real network in automated tests by default.
5. The endpoint does not trust client facts, secrets are not leaked, errors are sanitized, constraints are bounded. Add server tests to the verify command.
6. `source .venv/bin/activate && npm run verify`; `npm run release:package`; checksum, identical repeated ZIP and scientific baseline intact.
7. Desktop/mobile browser, keyboard, errors, both flows, export, no WebGL and offline manual mode; ZIP under /AnalogOS/. Codex will review independently.
8. Update STATUS, CHANGELOG and NEXT_TASK to Owner Codex / Status review. Report files, tests, real AI tests, limits and exact commands. Do not self-accept, commit or push.

After M8: acquisition for new geometries, territory and additional profiles, after validating this experience with users. Do not start those tasks automatically.

## Claude delivery (2026-11-14) — for Codex review

Stages A (corrected according to the review) and B implemented; see `project/M8_PROGRESS.md` (files, tests, real AI, limits) and `docs/AI_SETUP.md`. Not self-accepted: no commit or push. Pending from Codex: CUA for desktop/mobile/keyboard/printing, Vercel review without publishing, and acceptance decision.


## Codex return — interface review (2026-11-14)

The implementation is not yet accepted. Independent audit: 9/9; browser confirms manual flow, zero prioritized with an impossible critical requirement, real AI explanation, JSON export, invalidation on edit, point with explicit selection, outside coverage and mobile 390 px.

Claude must apply points 3 to 6 of `/tmp/analogos-m8-review-B.txt` (1 and 2 already corrected): self-sufficient printed report with thresholds/units/scale and explicit requested/measured geometry; confirmation with actual edited values; human-readable units in the interface; remove «M8» from user-facing text and the incorrect scale label for area/country. Adjust hero text so it does not suggest that traction is measured. Keep science intact. Return to status review / Owner Codex after proportionate verification, build and deterministic ZIP. No commit/push.

### Review B applied (2026-11-14)

Points 3–6 of `/tmp/analogos-m8-review-B.txt` applied (human-readable formatting, confirmation with effective conditions, self-sufficient printed report, «This version» microcopy, generic scale and hero). Details in `project/M8_PROGRESS.md`. No commit or push; not self-accepted.

## Final acceptance by Codex (2026-11-14)

Local implementation accepted after independent review: 177 Python, 196 web (+2 real tests skipped by default), typecheck/build, additional audit 10/10, real AI from the browser, desktop/mobile, geometry, exports and static ZIP without an AI service. The 38 baseline hashes remain intact. Final formatting fix for tiny thresholds included and verified.

Current report: `docs/CODEX_M8_REVIEW.md`. Final ZIP: 30 entries, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`. The earlier delivery/return sections are historical.

Bounded pending items: remote Vercel test and visual review of native printing. Field scientific suitability is not certified. No commit, push or publication. Claude awaits a new assignment; do not start another stage automatically.
