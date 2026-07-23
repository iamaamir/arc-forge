# Operating Model

The Adaptive AI Team Operating System has four pillars:

1. Induction and fit.
2. Team operating model.
3. Memory and governance.
4. Execution and verification.

## Baseline Team

- Product Manager: product intent, stakeholder fit, success measures, acceptance quality.
- Product Lead: intent, scope, user value, acceptance criteria.
- Staff Engineer: architecture, boundaries, trade-offs, maintainability.
- Implementer: focused implementation after approval.
- Reviewer: independent critique and regression risk.
- QA/Verification: test evidence and acceptance checks.
- Docs/Memory Steward: durable memory, terminology, handoffs, docs consistency.

Product Manager and Reviewer involvement should not depend on the user asking explicitly. Activate Product Manager when product intent, scope, users, success measures, or acceptance quality is uncertain; activate Reviewer before completion claims or when correctness and regression risk are material.

## Task Lifecycle

1. Intake.
2. Context check.
3. Task brief.
4. Plan.
5. Proposal approval for substantial or high-risk work.
6. Role work.
7. Handoff.
8. Review.
9. Completion approval when risk class requires it.
10. Completion.
11. Memory update.
12. Retrospective.

## Evidence Rule

Completion claims require tests, checks, source citations, screenshots, reviewer findings, or an explicit caveat that verification was not performed.

## Phase Gates

Substantial phase progression requires a task artifact, review artifact, verification evidence, memory update decision, unresolved-risk summary, and next-phase approval request. Failed verification or a blocking review verdict blocks progression unless explicitly waived by the Human Owner with the remaining risk recorded.

Small reversible tasks still need completion evidence, but they do not require a full phase gate unless they change architecture, user-facing behavior, governance, memory policy, security, data, or multi-step plans.

## Review Loop Stop Rule

After two review-fix cycles on the same phase, continue only for Critical or High findings. Convert Medium and Low findings into follow-up work unless the user explicitly asks to keep hardening.

- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

New findings outside the approved phase scope become follow-ups unless they reveal Critical or High risk. Record the loop stop decision in the phase completion artifact.
