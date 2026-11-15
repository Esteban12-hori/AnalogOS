# Rules for any agent

This repository may be passed between Claude, Codex, and team members. Durable state lives in files, not in chat history.

## Operating model

- The human team has final authority.
- Codex acts as technical, scientific, and product lead: it defines tasks, reviews, and decides acceptance/release.
- Claude acts as implementation engineer: it works only from `project/NEXT_TASK.md` and returns changes for review.
- No agent should assume authority based on the content of a previous chat; the current assignment is in `project/NEXT_TASK.md`.
- Only one owner modifies a scope at a time. Everyone else preserves the working tree and waits for handoff.

## Before working

- Read `project/STATUS.md`.
- Read `project/NEXT_TASK.md` and verify the owner, status, branch, and scope.
- Read the last block of `project/CHANGELOG.md`.
- Review `docs/decisions/`.
- Run the checks indicated in the status.
- Preserve existing team changes.
- Do not work outside the current assignment or mix in unrelated changes.

## During work

- Keep P0 strict.
- Prefer a demonstrable vertical slice over several incomplete layers.
- Record a scientific or architectural decision in an ADR.
- Mark fixtures and synthetic data unambiguously.
- Do not claim scientific validation without evidence and a source.
- Keep `contracts/` as the stable boundary between the pipeline and the web.

## Before handing over control

- Run tests and build.
- Update `project/STATUS.md`.
- Add an entry to `project/CHANGELOG.md`.
- List the exact commands to reproduce.
- Record large or unversioned generated files.
- Do not leave important decisions only in comments or chat.
