# README — product presentation

- **Owner:** Codex
- **Status:** accepted — content and verification completed by Codex
- **Branch:** dev
- **Authorization:** Dan asked to turn the dev README into a product presentation and to reduce the event-specific content.
- **Scope:** README focused on problem, user, journey, capabilities, evidence, limits and access; separate operational documentation; documentation continuity. No changes to the application, science, credentials or application submission.
- **Verification:** local links and commands checked against the repository, documentation diff, tests and build required by AGENTS.md. Keep outputs/ local and do not include it in the delivery.

## Result

- README of 75 lines focused on problem, users, journey, sources, optional AI, limits and local access. No event calendar, detailed rankings or internal agent instructions.
- `docs/DEVELOPMENT.md` keeps installation, operation, packaging, data reproduction, historical snapshots and continuity. Links in the guides and commands checked against the repository; 34 relative links verified with no missing targets.
- `source .venv/bin/activate && npm run verify`: 316 Python tests and 332 web tests passed, 3 real AI tests skipped by default; typecheck and build passed. Local log: `/tmp/analogos-readme-verify.log`.
- `git diff --check` passed. Documentation only; the ZIP was not regenerated and no real AI was queried. The generated local build is ignored by Git.
- Pre-existing `outputs/` remains local, not included in the commit. Documentation published on dev with `[skip ci]`, preserving the M10 application deployment and main.
