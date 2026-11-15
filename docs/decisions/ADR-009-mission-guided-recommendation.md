# ADR-009 — Evidence-guided recommendation, with AI assistance

- Date: 2026-11-14
- Status: accepted by Codex; local M8 implementation reviewed and accepted, with delivery limits recorded in `docs/CODEX_M8_REVIEW.md`
- Authorization: Dan asked for the flows define a test/choose a sector and receive a recommendation with data and AI to be implemented, under Codex supervision. He chose Anthropic as the provider.

## Problem and user

The lead of a planetary robotics campaign must justify where to conduct reconnaissance, which conditions each terrain reproduces, and what evidence is missing. The interface starts from that decision and keeps the scientific explorer.

## Decision

1. Two entry points: define the test and evaluate a sector. An editable brief is turned into explicit requirements that the user confirms before evaluating.
2. First supported profile: Mars rover mobility/navigation with a Jezero regional reference and v3 evidence. Other objectives are recorded as unsupported or pending data; do not reuse scores for the Moon, habitats, drilling or astrobiology.
3. Deterministic decision layer on top of v3: user requirements, per-criterion compliance, incompatibilities and missing evidence kept separate from the original similarity/confidence. Do not change weights, tolerances, data or scientific quality.
4. Critical requirements are evaluated before ranking. An unknown does not count as met nor is it compensated by high similarity. Similarity is not a probability of success. Never declare approved, safe, clear or authorized.
5. Yungay remains a reference in the historical search and may be a known alternative for a test; its role is always visible, without declaring it a discovery.
6. Covered sectors: evidence from the full polygon. New coordinates/bbox: resolve coverage without assigning the neighbor's metrics to a different geometry. Without sufficient evidence, deliver a diagnosis and a reproducible analysis request. This cut does not launch global downloads or replace missing data with AI.
7. Anthropic AI server-side only: proposes a structured draft and explains a computed recommendation. It does not create scores, geographic facts, permits, citations or official requirements. Sources and values come from validated artifacts.
8. Authorized extension to P0: optional minimal AI endpoint (Vercel/Node) and equivalent local server, with no database, new accounts or autonomous agents. Credentials via environment, never VITE_ or the browser. The text is sent to Anthropic only when AI is triggered, explained next to the button.
9. The manual flow, engine and export work without network or key. A provider failure is identified as AI unavailable; do not attribute a template to AI. Portable manual ZIP, without secrets or server functions.
10. Additive contracts for request/evaluation/AI responses, strict validation, size and time limits, text escaping, references restricted to the catalog. No code execution or arbitrary navigation from briefs.

## Validation

Vercel integration fix (2026-11-14): the pure requirements core and the validators live in `shared/`, outside the web ESM package. The web keeps re-exports and the server imports the shared core directly. This prevents the CommonJS function from requiring files emitted as ESM by the nested `package.json` of `apps/web`. There are no two engines or formula changes. CI runs the actually packaged function (GET 405 and POST without key 503) before deploying; that check also verifies the presence of the snapshot and contracts.

Distinct requirements, exclusions, insufficient data, Yungay, zones without coverage, malformed/timeout/keyless AI, late responses and no-WebGL mode. Real Anthropic test with a configured credential; mocks do not replace it. Details in project/NEXT_TASK.md.

## Sources

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://vercel.com/docs/functions/runtimes/node-js
- https://www.nasa.gov/solar-system/moon/nasa-testing-advanced-capabilities-for-moon-mars-rovers/

## Limits

Validate usefulness with campaign leads. Field data, territory, additional profiles and interactive acquisition for new sectors are missing. Bibliographic novelty and suitability for a test are independent questions.
