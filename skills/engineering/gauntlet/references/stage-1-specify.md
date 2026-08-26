# Stage 1: Specify

Input: the human requirement.

Produce two artifacts in the target project:

1. `features/<name>.feature` — Gherkin acceptance tests covering observable behavior: happy paths, edge cases, failure modes. Every scenario must be mechanically checkable later.
2. `docs/QA.md` (or append) — the system-level QA procedure, written strictly from a **human operator's point of view**: you are a user operating the finished system at its real interface (UI, CLI, API), and every step must prove the system works from outside. Rules:
   - Describe journeys, not developer chores: "adopt the tool in a fresh project and reach green" — never "run npm test" (unit tests are already gated elsewhere)
   - Each step must be externally observable and mechanically assertable later (exit codes, output text, file state) so stage 5 can translate it into an executable script
   - Cover what a professional QA hired for THIS product would test: adoption journeys, misuse paths (typos, missing config), failure UX, integration with real workflows

Present both to the user. Do not proceed to stage 2 until they approve. Record approval in `gauntlet-state.md`.

Lifetime note: `.feature` files persist deliberately as executable acceptance criteria; the QA document is an ephemeral input that stage 5 converts into a committed executable driver script (the script is test code — it persists; only the prose is ephemeral).
