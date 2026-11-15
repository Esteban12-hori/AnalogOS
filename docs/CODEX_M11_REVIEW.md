# M11 — Mobile Reading and Print Review

Date: 2026-11-15. Direction and acceptance: Codex. Implementation: Claude Code (session `e2bcb604-46ab-458e-b977-7fb6ede8eb6c`), reviewed in three rounds. Base: `ce86a879905cb927d9881aae6ab564d9082f39fc`.

## Decision

**Code accepted by Codex after independent review and testing.** Dan asked to delegate and review before publishing dev; he later extended the assignment to a review of the whole and promotion to main/production. Remote publication and re-testing are recorded at the end of this document.

## Product outcome

- "Go to the Reading" appears next to the result summary, before the alternatives. In Chrome 390×844: and y≈459 px, height 44 px; it is now visible without scrolling through the full list. Previously it was at y≈1470 px and measured 34 px.
- It opens the mobile sheet tab, the standalone Reading if there is no selection or it is a world reference, the pill at 1100–1439 or the left panel at ≥1440. Only the UI changes: it preserves selection, scope, requirements and calculation; it does not request AI.
- A single report for the current evaluation. While it is mounting, printing is disabled. After editing, Ctrl+P shows a notice; it does not keep the previous report for printing.
- Paginated printing outside the fixed stage; criteria tables with legible widths, repeated headers, full links, and geology with the same evidence and limits as on screen. Codex grouped provenance and fingerprints so they are not separated when the page changes.

## Independent evidence

| Check | Result |
|---|---|
| 390×844, seven-sector result | CTA visible, 44 px; Enter opens Reading, focus on the title |
| 1280×800 | Opens the pill in Mission without depending on selection; Escape closes and returns focus |
| 1440×900 | Focuses the left-panel Reading; a single report mounted |
| No mobile selection | Standalone Reading in S2; Back returns to the tray |
| MDRS world reference selected | Reading opens without replacing the reference; Escape returns to its card |
| No sector prioritized (synthetic threshold 0,001°) | Valid result, CTA operational, consistent report |
| Synthetic point (0°, 0°), outside coverage | Diagnosis of insufficient evidence and Reading accessible; without inheriting geology or measurements from another window |
| Editing after evaluating | Previous report removed; native one-page print with re-evaluation notice |
| Full native PDF | Saved from Chrome, all pages rendered and reviewed |

The PDF prior to the fix had **a single page**, cut off after geometry. The final one uses Letter, Default margins and Default scale (100 %), with browser headers/footers: **18 pages, none empty**, seven sectors, Yungay REF, results, four geological orientations and three exclusions, SERNAGEOMIN/SEGEMAR, units/coverage/limits/sources and full provenance. The number of pages changes with the user's options; content integrity is the criterion. The earlier preview with 90 % scale and minimum margins gave 12 pages.

- PDF: `submission/evidence/m11-seven-sectors-print.pdf`, SHA-256 `76e1f2949ac3422782acebbf007b404d6a89ff60cc260c2269d3fadddd8fedb8`.
- Mobile screenshot: `submission/assets/m11-mobile-reading.jpg`.
- Synthetic manual test: app example, not operational requirements or field validation.
- Request fingerprint of the example: `85b453d5edfb38589a781ff74c532526789409c63efbefd73e786b6bf88d5c6b`; evaluation `035031fc7b243fd927baaf05b2bc3c98a8b8ae6a6788e121c94e9329898e2eb6`.

## Tests and package

- `PATH="$PWD/.venv/bin:$PATH" npm run verify`: **333 Python, 799 web**, 3 opt-in skipped; server types and build correct. Codex log: `/tmp/analogos-m11-codex-verify.log`.
- After the final provenance grouping adjustment: 35 related tests and build correct; logs `/tmp/analogos-m11-print-final-tests.log` and `/tmp/analogos-m11-print-final-build.log`. No tests were added that merely look for CSS rules.
- ZIP regenerated with `PATH="$PWD/.venv/bin:$PATH" python scripts/package_release.py`, CRC and checksum verified: **73 entries, 14799960 bytes**, SHA-256 `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- `git diff --check` clean. No changes in shared/, server/, api/, artifacts/, contracts, dependencies or CI. No Anthropic key in the distributed build. Unrelated `outputs/` preserved.

## Scope of the verification

Chrome and its viewport sizes were tested; this is not equivalent to testing gestures/virtual keyboard on a physical iOS device or all print engines. The local manual flow works without an AI endpoint. The GIBS tile failure test via network blocking remains separate from the M11 fix; the local images and SVG are the existing fallback. The science and the pilot's coverage are not expanded.

## Publication

**Completed and verified.** Code `e5e91390b2eea261b1f8d46f3b17786b2bb295dc` published without force to dev and then main.

- Dev: [Actions 43686593750](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686593750), successful. Published seven-sector walkthrough, visible mobile CTA of 44 px, Reading with focus and a report with seven tables/geology/provenance verified in `https://analogos-dev.vercel.app/`.
- Production: [Actions 43686863876](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686863876), successful, including verification of the packaged function. `https://analogos.vercel.app/` responds HTTP 200; GET /api/ai returns 405 method_not_allowed, as expected.
- **Real** AI in production from Chrome: choose AR6 → Evaluate this sector → send synthetic brief in the dock → propose four requirements with Claude → explicitly review/confirm → evaluate **AR6 only** → mobile CTA → Reading → explanation with geology. Result: 1 of 1 prioritized, 1 of 3 preferences met, 2 without measurement; the mapping does not turn them into measurements.
- Draft: `claude-sonnet-5-5`, `req_011Ch4GRLhf2qaDPw9s9n74t`, `2026-11-15T06:48:27.845Z`, tokens 2221/1107, end_turn.
- Explanation/geology: `claude-sonnet-5-5`, `req_011Ch4GYHwfPJwQELdTSRFD4`, `2026-11-15T06:49:57.535Z`, tokens 7174/332, end_turn. Three valid SEGEMAR references: surface material in two units and map-terrain contrast in Galán.
- Export downloaded from the application: `submission/evidence/m11-production-geology-export.json`, SHA-256 `15b6f1a374b1738fdd0efed4ff77c46e428f53a6dd599365f7f9a93cc54adaaa`. Validated with `validateAnyMissionExport` and rebuilt identically with `buildMissionGeologyExport`, using official snapshot v3 and geological context. Request `dbb1d0867b4fb6d6d08d9f40ea9a0b2111d653485d0fb90e78ee74ad9bb8a159`; evaluation `e6c8fbf94658b7447a1c64b3ae998c4f89bd3ff1659004248845d7bedf2f0174`.
- Real published screenshot: `submission/assets/m11-production-mobile.jpg`. No console errors in the local/dev/production walkthroughs. Test size restored; print margins/scale returned to the previous preferences after saving the evidence.
- The subsequent checkpoint `[skip ci]` adds only evidence and continuity, without altering the deployed code or ZIP. Development remains on dev; Claude has no new assignment.
