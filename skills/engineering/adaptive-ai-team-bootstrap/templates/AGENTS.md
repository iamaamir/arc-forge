# Agent Instructions

Template-Version: adaptive-ai-team-bootstrap@0.1.0

## Start Here

Read these files before making project-changing decisions:

1. `docs/ai-team/constitution.md`
2. `docs/ai-team/Memory.md`
3. `docs/ai-team/workflow.md`
4. `docs/ai-team/governance.md`
5. `.ai-team/tasks/` for active work

## Project Induction

Before changing project structure, instructions, team roles, memory policy, or governance, inspect the project and present a proposal for approval.

## Precedence

1. Direct user instruction.
2. Repository instruction files.
3. Approved `docs/ai-team/constitution.md`.
4. ADRs and durable docs.
5. Code and tests as implemented reality.
6. `docs/ai-team/Memory.md`.
7. Role/team defaults.
8. General skill guidance.

## Safety

- Do not store secrets in docs, memory, logs, task briefs, or screenshots.
- Mark inferred facts as inferred until confirmed.
- Ask for approval before high-risk changes.
- Provide evidence before claiming completion.
- Activate Product Manager and Reviewer when their triggers apply; do not wait for the user to ask for them by name.
- Do not pass a substantial phase gate without task, review, verification, memory-decision, unresolved-risk, and next-approval artifacts. Failed verification or a blocking review verdict blocks progression unless explicitly waived.
- After implementation work changes project source files, run `check-ai-team.mjs --require-runtime-trace` before claiming completion.
- Stop review loops after two review-fix cycles on the same phase unless Critical or High findings remain. Capture Medium and Low findings as follow-ups unless the user requests continued hardening.
