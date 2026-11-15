# Handoff Protocol

## Objective

Allow another agent to resume the project without depending on the previous chat.

## Responsibilities

- Codex defines the assignment in `project/NEXT_TASK.md`, reviews the result, and decides on acceptance.
- Claude implements the assigned task and delivers it with status `review`; it does not self-approve.
- The human team authorizes business decisions and final external actions.
- `dev` is the normal implementation branch; `main` is reserved for reviewed changes and approved deliverables.

## Before transferring control

1. Stop at a consistent state; do not leave partially written files.
2. Update the assignment status in `project/NEXT_TASK.md`.
3. Run all available tests and builds.
4. Update `project/STATUS.md`.
5. Add an entry to `project/CHANGELOG.md`.
6. Create an ADR if the product, science, data, contract, or architecture changed.
7. List large/unversioned files and how to regenerate them.
8. Record required environment variables without copying secrets.
9. Leave the next three steps in order.

## Required STATUS format

- date/time and owner;
- active milestone;
- what works;
- what is incomplete;
- exact commands;
- test/build results;
- new decisions;
- blockers;
- next three steps.

## When to create an ADR

- changing the stack;
- changing the formula or weights;
- selecting a product/dataset;
- changing the screening resolution;
- changing the JSON contract;
- changing the treatment of sensitive areas;
- adding a backend or external dependency;
- activating AI or the lunar profile.

## ADR template

Create `docs/decisions/ADR-NNN-titulo.md`:

```markdown
# ADR-NNN Title

- Date:
- Status: proposed | accepted | superseded
- Owner:

## Context

## Options

## Decision

## Consequences

## Validation
```

## Handoff to Codex

When Claude finishes, it must leave `project/NEXT_TASK.md` in `review`. Codex opens the folder, reads `prompts/RESUME_CODEX.md`, verifies the diff and the evidence, and decides between `accepted`, `changes_requested`, or a new task. Claude does not change the status to `accepted`.
