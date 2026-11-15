# M8 Review and Acceptance — Codex

**Delivery update:** M8 was published to dev and both AI operations were actually verified on 2026-11-14. Current evidence, runtime correction and final checksum are in `docs/DEV_AI_VERIFICATION.md`. The rest of this document preserves the local acceptance checkpoint prior to publication.

Date: 2026-11-14. Implementation: Claude Code, supervised by Codex with two returns for rework and verified corrections. Base: `4d197e17893dc4eef2dc5c9771c79813c909b657`, local branch `dev`. No commit, push or publication of M8.

## Decision

The local implementation of the planner for planetary robotics campaign managers is accepted. It allows defining a trial or choosing a sector, reviewing and confirming requirements, receiving a reproducible prioritization and exporting the diagnosis. Anthropic works in practice as an optional aid to propose requirements and highlight reasons that were already computed.

The acceptance covers software and local integration, not field suitability or a verified remote deployment. The available profile is Mars rover/Jezero; the evidence corresponds to six candidates in Chile and Argentina plus Yungay as a known reference. No data were acquired for new geometries and no live global search was enabled.

## Independent evidence

| Check | Result |
|---|---|
| `source .venv/bin/activate && npm run verify` | 177 Python tests, 196 web tests, 2 real AI tests skipped by default; server typecheck and build correct |
| Additional Codex audit | 10/10 cases pass, separate from the tests written by Claude |
| Baseline of science, visual context, configuration and existing contracts | The 38 files retain their hashes |
| Repeated packaging | Two runs produce the same ZIP; its 30 entries match byte for byte with `apps/web/dist` |
| Key and package | The real key does not appear in versionable files or in the ZIP entries; `.env` ignored; no server function in the static package |
| Desktop browser | Both flows, confirmation, results, editing that invalidates results, coordinate errors, JSON exports and operation with real AI |
| Mobile | 390 × 844, controls and text legible, document width 390 px; no horizontal overflow observed |
| Keyboard | Entering the flow and confirming with Enter; step focus/announcement present |
| ZIP under `/AnalogOS/` | Application and local data load; external network blocked in the test; absent AI gives a clear error and the manual flow continues |
| Printable report | Content and effective conditions verified with rendering tests and CSS review; native print view pending visual inspection |

The independent audit includes threshold-sensitive selection (regional slope ≤ 2,3° leaves one sector; ≤ 0° leaves zero), Yungay evaluable as a reference, a subpolygon that does not inherit statistics, rejection of an export from another request, a point-scale value not converted into a regional median, timeout during body reading, SHA-256 fingerprints compatible with Node, a current response with the wrong fingerprint that ends in error, provenance preserved after a failed retry, and a tiny threshold that is never displayed as zero.

The temporary audit files of this session were `/tmp/analogos-m8-audit.test.ts`, `/tmp/analogos-m8-audit.config.mjs` and `/tmp/analogos-m8-final-verify.log`. The corresponding regressions were also incorporated into the repository tests. The nine snapshot tests repeated during the build are not counted as additional tests.

## Real Anthropic

Codex verified from the interface, with harmless example inputs and `claude-sonnet-5-5`:

| Operation | UTC date | Request ID | Input/output tokens |
|---|---|---|---|
| Highlight reasons of an evaluation | 2026-11-14T20:20:48.843Z | `req_011Ch3SZfUu5fd5ACoQKqHWc` | 4365 / 398 |
| Propose editable requirements | 2026-11-14T20:25:27.672Z | `req_011Ch3SuvcnEHTWXVzW1LFvG` | 2162 / 846 |

Both ended with `end_turn`. The JSON files were downloaded and reviewed from the browser: draft provenance and explanation kept separate, confirmed requirements, geometry, evaluation and sources coherent. Local summary without secrets: `../outputs/analogos-m8-browser-ai-smoke.json` relative to the repository root. The additional real tests by Claude are recorded in `project/M8_PROGRESS.md`.

After these calls only presentation text/formatting was adjusted; full tests and build were repeated. The local test is not presented as verification of the function deployed on Vercel.

## Corrections required during supervision

- Geometry: exact match with numerical tolerance only; not even a nearly identical subarea receives measurements from the full polygon. A point inside a window requires selecting it explicitly; outside coverage it produces a diagnosis, with no substitute neighbor.
- AI: strict JSON, figures and countries anchored to the brief's quotation, distinction between point-scale maxima and regional medians. Timeout covers headers and body. The server recomputes facts from the snapshot and never accepts scores from the client.
- State: editing invalidates confirmation and result; late responses do not contaminate another request; an incorrect fingerprint on a current response ends in error. A failed retry preserves the provenance of the draft still in use.
- Export: revalidates request and evaluation; keeps the original draft, user changes and explanation separate. It does not export results from another request.
- Presentation: confirmation shows actual thresholds, units and scale; the report contains conditions and geometry even without options. Unknown preferences leave a partial comparison. Traction, permits and point-scale maxima are not announced as measured.
- Final Codex adjustment: extremely small numbers keep scientific notation instead of being rounded to zero; coverage label valid for both a window and the catalog. Regression in `missionFormat.test.tsx`.

## Artifact and reproduction

- Current ZIP: `submission/analogos-static.zip`, **12.987.711 bytes**, **30 entries**.
- SHA-256: `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`.
- Own checksum: `submission/analogos-static.zip.sha256`; `SHA256SUMS.txt` corresponds to the historical v2 ZIP and is retained.
- Reviewed screenshot: `submission/assets/analogos-m8-review.png`.

```bash
source .venv/bin/activate && npm run verify
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
npm run preview -- --host 127.0.0.1 --port 4187 --strictPort
```

The local view remains at `http://127.0.0.1:4187/` while the process is still active. `npm run test:ai-live` makes real calls and requires the local configuration described in `docs/AI_SETUP.md`; it is not part of the default tests.

## Pending items and acceptance limits

1. Publish and test the function on Vercel in a later delivery stage: configure provider variables in the correct environment and verify inclusion of artifacts, duration and the real flow. No remote secrets, authentication or workflows were touched.
2. Visually review native printing on the presentation machine. The attempt from IAB did not allow observing the dialog and access to the native application was rejected for security reasons; the restriction was not circumvented and no claim is made that a PDF was printed.
3. Validate usefulness with campaign managers; integrate territory, additional bibliography and local climate contrast. The aggregated data do not measure traction or wheel-scale obstacles, and do not authorize access.
4. The rate limit is basic, in-memory and per instance; origin control does not replace authentication. It must be reviewed if the service's exposure is expanded.

Claude is left without a new assignment. The next task must be explicitly recorded in `project/NEXT_TASK.md`.
