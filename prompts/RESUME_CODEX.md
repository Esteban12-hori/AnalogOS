# Prompt for Codex to resume control

**Current checkpoint — ENGLISH-DEFAULT completed (2026-11-15):** English default throughout the repository and application, with `README.es.md` retained. Codex reviewed Claude’s phases and completed the final mobile-copy corrections. Final code `fab8ed9` is on dev/main; Actions dev `43723813882` and production `43724021553` succeeded. Full verify: 335 Python / 898 web, three skips, types/build; final UI patch: 41 related tests/build passed. Real AI draft/explanation/geology and export reconstruction verified, English production screenshot updated. Read `docs/CODEX_ENGLISH_REVIEW.md` for evidence and explicit native-PDF/device/network QA limits. The final `[skip ci]` checkpoint changes documentation/evidence only. No new assignment for Claude; do not restart historical phases below.

**Historical M11 checkpoint 2026-11-15:** M11 implemented by Claude and accepted by Codex after three rounds and real QA of mobile Reading/PDF. Read STATUS and docs/CODEX_M11_REVIEW.md first. Published without force to dev/main, code e5e91390b2eea261b1f8d46f3b17786b2bb295dc; Actions dev 43686593750 and production 43686863876 correct. Real AI AR6 and export validated in production. The subsequent [skip ci] checkpoint only records evidence and continuity. Development on dev; Claude has no new assignment. The mobile/printing pending items cited in the background below have already been resolved. Do not start another milestone.

When Claude has finished, ask Codex:

```text
Resume AnalogOS at /Users/dan/Documents/Codex/2026-09-08/ana/analogos-chile.

Do not assume the chat summary is correct. Read AGENTS.md, project/NEXT_TASK.md, project/STATUS.md, the latest entry in project/CHANGELOG.md and all ADRs. Review the diff and run the recorded build/test commands. Inspect the application visually and validate artifacts against contracts/.

Then:
1. report what is actually working;
2. identify debt, inconsistencies or deviations from the specification;
3. fix critical issues within the active milestone;
4. if the milestone is closed, report the next gate from project/BACKLOG.md without starting an unauthorized scope;
5. update project/STATUS.md and project/CHANGELOG.md.

Codex is the technical, scientific and product lead. Review Claude's delivery before accepting it and write the next unit of work in project/NEXT_TASK.md. Claude implements; it does not decide acceptance, releases or scope changes.

Keep P0 strict: Mars rover/Jezero, the Chile–Argentina pilot of 50 windows, PDS/MOLA, a static-first architecture, deterministic evaluation and an offline demo. The active snapshot is science-v3: six candidates and Yungay as a reference outside the historical discovery ranking, while remaining a known alternative that can be evaluated for a test. Preserve v2, the science, profiles and original data.

Historical integration checkpoint: Gus/Claude integrated the Explore/Mission redesign in dd625b4, and Codex accepted it. The correction was published at https://analogos-dev.vercel.app/: code 9c183fb8cc5d8adbc717f931efd64bf877ddb0b0, successful Actions 43681551867. Sending a brief from the dock preserves the selected sector. ADR-013/014 were accepted; Yungay remains outside the discovery ranking and can be evaluated/prioritized as a known Mission alternative, always REF (ADR-009 §5). Read docs/CODEX_INTEGRATION_REVIEW.md and docs/DEV_AI_VERIFICATION.md: real Anthropic draft and geological explanation were tested from the integrated interface, and the export was validated and rebuilt from official data. Verification at that checkpoint: 333 Python/784 web tests, 3 opt-in web tests skipped, types/build passed. M8/M9/M10 and their data are preserved. Anthropic selects checks supported by SERNAGEOMIN/SEGEMAR; it does not change scores or evaluation, or measure traction. At that time, mobile Reading access, offline GIBS, native printing and physical iOS testing remained pending. Later checkpoints supersede these historical pending items.

Subsequent production promotion authorized by Dan: main advanced to 7e8c7798186e02a5014f6bf8b79554b7faa84c3c, matching dev. Production Actions 43682694089 and dev Actions 43682693561 succeeded. The README was updated for Explore/Mission; the screenshot was captured from the new production after deployment. Both Anthropic operations and AR6 geology were tested live at https://analogos.vercel.app/; the export was validated and rebuilt. Read docs/PRODUCTION_RELEASE.md and the top of STATUS. The subsequent documentation/screenshot checkpoint used [skip ci] and preserved deployed code; development continues on dev.

Always follow the current NEXT_TASK owner and status. At the historical accepted checkpoints, Claude had no new assignment. Preserve Vercel protection and keep secrets in server runtime only. Do not claim worldwide coverage, novelty or field suitability. Do not add SAR, a lunar profile, regions, weights or infrastructure outside the authorized scope. Future promotions to main require an assignment; the historical publication described above was already completed.
```
