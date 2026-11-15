# M11 Production Update — 2026-11-15

Code `e5e91390b2eea261b1f8d46f3b17786b2bb295dc`, promoted from dev after Codex's review of Claude's three deliverables. Production [Actions 43686863876](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686863876) and [dev 43686593750](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686593750) succeeded.

Mobile Reading with a visible 44 px action and navigation that preserves the mission. Full and paginated printing with geology and sources, with no outdated report after editing. Seven-sector PDF saved and reviewed (18 pages with Letter and default scale/margins). 333 Python/799 web, 3 opt-in skipped, types/build correct; later validation of the final adjustment documented.

In https://analogos.vercel.app/, Claude's real draft and geological explanation for AR6 were checked again from the new mobile Reading. JSON validated and rebuilt identically. Evidence, provenance, hashes and limits: [M11 review](CODEX_M11_REVIEW.md). The subsequent [skip ci] checkpoint records only evidence/documentation; it preserves the deployed code and ZIP.

---

## Previous release (background)

# AnalogOS Production Release — 2026-11-15

**Status: published and verified by Codex.** Dan authorized updating the README and promoting the entire reviewed version from dev to main, and specified this order: publish first and then replace the screenshot with a capture of the new production.

## Version and release

- Deployed code: `7e8c7798186e02a5014f6bf8b79554b7faa84c3c`.
- Production: https://analogos.vercel.app/ — [Actions 43682694089 succeeded](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682694089).
- Dev: https://analogos-dev.vercel.app/ — [Actions 43682693561 succeeded](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682693561).
- `main` advanced from `437b515` to the complete dev delivery, without force or loss of history. There is no master branch. Main and dev were synchronized at the same commit.
- The subsequent capture/documentation/evidence checkpoint uses `[skip ci]`: it does not change the deployed code or the ZIP. Both branches receive that checkpoint; development continues in dev.

## README and screenshot

The README presents Explore/Mission, how to start from a sector, Your mission and Reading, geology, mobile use and analogs to be calculated, and links to the public application. It preserves the real scope of the pilot and the role of Yungay as a known reference.

**The screenshot was taken after publishing main**, from `https://analogos.vercel.app/`, in Explore mode with the first candidate selected: `submission/assets/analogos-production.jpg`. Original browser JPEG, 218.607 bytes, SHA-256 `bcfbd0e5f313030bf3d973f6edeb3f19984509a133bc06d71836fb372a5c0ffe`. It is not a mockup or a capture of the previous version.

## Production AI

The workflow now delivers the existing Anthropic secret to dev and main **only at runtime**; it is not printed, versioned or sent to the build/browser. The model, limits and server validations are preserved. Without the secret, publication stops. The dev protection was not modified and no accounts or authentication were added.

The new public page loads without dev's access barrier (HTTP 200). The real endpoint responds 405 to GET (`Solo se admite POST.`). From the published interface, the following was tested:

1. AR6 → Evaluate this sector → write a synthetic brief in the dock → Send: keeps AR6.
2. Real Anthropic draft: four unconfirmed requirements (regional median slope ≤9°, non-vegetated preference ≥95 %, geological orientation and traction as unmeasured pending items). These are demonstration thresholds, not official operational criteria.
3. Explicit confirmation and evaluation: a single AR6 window, prioritized for reconnaissance; one of three preferences satisfied and two without data. No field authorization.
4. Real explanation with geology: three valid SEGEMAR references 1:250.000, Galán surface material and alluvial/colluvial deposits and Galán map–terrain correspondence. The AI did not change evaluation, data or posts.
5. Export downloaded `submission/evidence/production-geology-export.json`, accepted without incident by `validateAnyMissionExport` and rebuilt identically through `buildMissionGeologyExport` with official snapshot/context. SHA-256 `3fa32ea9c4ffd0137e8ab6d520a2c3eb114ad0126c26078c27821d1f006aedcd`. Backup capture: `submission/assets/analogos-production-ai.jpg`.

| Operation | Provenance of the accepted response |
|---|---|
| Draft | `claude-sonnet-5-5`, `req_011Ch4C8fgUYoQgoF8HZmeBX`, `2026-11-15T05:52:16.354Z`, 2217 input tokens / 1379 output |
| Explanation and geology | `claude-sonnet-5-5`, `req_011Ch4CDE41TMGKqYLUsgFLD`, `2026-11-15T05:53:11.040Z`, 7156 / 314 tokens |

Both responses ended in `end_turn`. The provenance records the accepted response, not the aggregate consumption of a possible internal retry.

## Checks and limits

- `source .venv/bin/activate && npm run verify`: **333 Python and 784 web** correct, 3 opt-in web skipped; server types and build correct.
- Deploy shell step run with a simulated CLI, without real credentials, for dev/main with and without key: four correct cases; main includes `--prod`, absence of the key prevents calling Vercel and the key does not appear in the output. Both real workflows then verified startup of the packaged function before publishing.
- Local paths and README image verified. Science, contracts, core, frontend and ZIP did not change with respect to the accepted integration; this promotion adds documentation and enables the AI configuration at production runtime.
- The pending items from `CODEX_INTEGRATION_REVIEW.md` are preserved: direct access to Reading from the mobile popover, GIBS offline, native printing and real iOS. The release does not validate the sites in the field or expand coverage.
- In-memory rate limiting per instance and Origin checking are preserved; they are not equivalent to authentication or a distributed quota. Details in `AI_SETUP.md`.
- Pre-existing `outputs/` remained outside the commits. There is no new assignment to Claude.
