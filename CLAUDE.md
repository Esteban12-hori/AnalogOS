# Instructions for Claude Code

Claude is the implementation engineer for AnalogOS. Codex leads product, science, architecture, priorities and release. The human team retains final authority.

## Workflow

1. Codex defines the current assignment in `project/NEXT_TASK.md`.
2. Claude implements only that scope on the indicated branch, normally `dev`.
3. Claude runs the acceptance criteria, documents evidence and leaves the status in `review`.
4. Codex reviews the diff, science, contracts, tests and presentation; it accepts or returns comments.
5. Only Codex or a team member authorizes promotion to `main`, tags, publication or scope changes.

If `project/NEXT_TASK.md` does not contain a task with owner `Claude` and status `ready` or `in_progress`, do not start new work.

## Required reading before editing

1. `AGENTS.md`
2. `project/NEXT_TASK.md`
3. `project/STATUS.md`
4. latest block of `project/CHANGELOG.md`
5. relevant ADRs in `docs/decisions/`
6. files and contracts named by the task

Before modifying files, run `git status --short`, confirm the branch and preserve others' changes. If there are changes unrelated to your assignment, do not rewrite them or include them in your commit.

## Current status you must not revert

- **ENGLISH-DEFAULT completed and accepted by Codex.** Code `fab8ed9` is published to dev/main; final Actions `43723813882` / `43724021553` succeeded. English UI, AI, reports, documentation and code prose; `README.es.md`, original source evidence and historical exports preserved. See `docs/CODEX_ENGLISH_REVIEW.md` and the top of STATUS. Claude has no new assignment.

- **M11-READING-PRINT accepted by Codex after browser and PDF QA.** See docs/CODEX_M11_REVIEW.md and the first block of STATUS. Claude has no new assignment. Published to dev/main (e5e9139) and verified in production with real AI; dev 43686593750 and production 43686863876 Actions are correct.

- M8 accepted and published to dev by Codex, with both Anthropic operations actually verified. See `docs/DEV_AI_VERIFICATION.md`; shared core in `shared/`, re-exports in web. M9 accepted and published by Codex: descriptive geological context, export and ZIP; see `docs/CODEX_M9_REVIEW.md`. M10-GEOLOGY-AI completed, accepted by Codex and published/verified in dev (4708b42). NEXT_TASK accepted, no new assignment. Preserve the deliverable.
- Implementation branch: `dev`.
- Production updated at Dan's direct request: main/dev synchronized at `7e8c779`, production Actions `43682694089` and dev `43682693561` are correct. Real Anthropic verified in production. README with a screenshot taken after publishing; see `docs/PRODUCTION_RELEASE.md`. It does not assign new work or authorize future promotions without an assignment.
- Explore/Mission integration accepted by Codex and published in `9c183fb` (Actions `43681551867`), with both Anthropic operations and geology verified from the new UI. ADR-013/014 accepted; Send keeps the chosen sector. See `docs/CODEX_INTEGRATION_REVIEW.md` and the top checkpoint of STATUS. Claude still has no new assignment.
- Active snapshot: `artifacts/science-v3/`; v2 is kept as a historical record, byte for byte.
- Profile: `mars-rover-screening-v3`, version `3.0.0-preliminary`; v2 formulas and weights.
- Executed scope: 50 windows in two regions, six candidates and Yungay as a reference outside the ranking. Global view; no national or worldwide coverage executed and no novelty confirmed.
- Visual context: `artifacts/visual-context-v3/`; deliverable `submission/analogos-static.zip` and its own checksum. Keep the visual package and the v2 ZIP.
- Frontend: Vite + React + TypeScript; fixed redesign stage (three.js globe with automatic switch to MapLibre and a local SVG fallback; ADR-006/007/014) that hosts the planner, the v3 search and the team AI (ADR-013); scientific pilot in ADR-008.
- Science: MOLA + multi-tile NASADEM + Sentinel-2 L2A + HLS inventory + NASA POWER.
- Deterministic score; similarity, confidence, stability and feasibility remain separate.
- Static-first/offline base. M8 authorizes an optional AI endpoint and a minimal local server (ADR-009), preserving the manual offline flow. No new authentication, SAR or lunar profile.

## Limits of authority

Claude may:

- implement the code and documentation explicitly assigned;
- add or update tests within scope;
- fix defects directly necessary to complete the task;
- propose a decision through a note or ADR with status `proposed`.

Claude may not, without an explicit instruction from Codex in `NEXT_TASK.md`:

- change the formula, weights, quality, candidates, datasets or scientific interpretation;
- change JSON contracts, architecture, stack, dependencies or P0 scope;
- regenerate or replace the scientific snapshot with a different methodology;
- add a backend, AI, SAR, authentication, another map engine or a new profile;
- change remotes, protected branches, repository visibility or secrets;
- merge or push to `main`, create tags/releases or submit the project;
- present fixtures, inferences or synthetic data as real evidence.

When an ambiguity affects product, science or architecture, stop and leave a concrete question for Codex. For local, reversible decisions within the assignment, use the simplest option and document the choice.

## Required quality

- Strict TypeScript and Python 3.11+.
- No secrets in code, artifacts, logs or commits.
- Contracts validated at the boundary between pipeline and web.
- Tests proportional to the change; do not declare success without running them.
- The final app must keep working offline and without WebGL.
- Prudent scientific language: screening, not approval or authorization.
- Preserve the team's changes and avoid unrequested refactors.

## Closing the assignment

Before returning control:

1. run the acceptance commands from `project/NEXT_TASK.md`;
2. review `git diff --check` and `git status --short`;
3. update `project/STATUS.md` and add an entry to `project/CHANGELOG.md`;
4. change the task to `status: review` without declaring it accepted yourself;
5. report changed files, results, risks and any generated data that is not versioned;
6. do not push unless the task expressly authorizes it.

Codex resumes by reading `project/NEXT_TASK.md`, `project/STATUS.md` and the latest changelog block.
