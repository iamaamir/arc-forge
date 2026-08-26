# Stage 1: Specify

Input: the human requirement.

Produce two artifacts in the target project:

1. `features/<name>.feature` — Gherkin acceptance tests covering observable behavior: happy paths, edge cases, failure modes. Every scenario must be mechanically checkable later.
2. `docs/QA.md` (or append) — the system-level QA procedure: which flows to exercise end to end and what must be true afterward.

Present both to the user. Do not proceed to stage 2 until they approve. Record approval in `gauntlet-state.md`.

Lifetime note: `.feature` files persist deliberately as executable acceptance criteria; the QA document is an ephemeral input that stage 5 converts into an executable script.
