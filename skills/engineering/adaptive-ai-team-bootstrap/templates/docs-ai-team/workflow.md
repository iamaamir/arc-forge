# AI Team Workflow

Template-Version: adaptive-ai-team-bootstrap@0.1.0

## Project Induction

Inspect first, propose second, apply only after approval.

Product Manager and Reviewer involvement should not depend on the user asking explicitly. Activate them when product intent, acceptance quality, correctness, regression, or completion risk is present.

## Task Lifecycle

1. Intake.
2. Context check.
3. Task brief.
4. Plan.
5. Proposal approval for substantial or high-risk work.
6. Role work.
7. Handoff.
8. Review.
9. Completion approval when risk class or decision rights matrix requires it.
10. Completion.
11. Memory update.
12. Retrospective.

## Handoff Minimum

- Current goal.
- Completed work.
- Evidence.
- Assumptions.
- Risks.
- Open questions.
- Next action.

## Completion Rule

Completion requires evidence. If verification cannot be performed, do not claim completion; state what remains unverified and who must approve the risk.

After implementation work creates or changes project source files, run the AI-team checker in strict trace mode before claiming completion:

```sh
node .agents/skills/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs --project . --require-runtime-trace
```

Strict trace mode requires task, review, and verification-log artifacts when source files exist. This catches process bypass after bootstrap.

## Blocking Phase Gate

Before a substantial phase progresses, record:

- Task artifact.
- Review artifact.
- Verification evidence.
- Memory update decision.
- Unresolved-risk summary.
- Next-phase approval request.

Failed verification or a blocking review verdict blocks progression unless the Human Owner explicitly waives it. Record the waiver, approver, reason, and remaining risk before moving forward.

Small reversible tasks still need completion evidence, but they do not require a full phase gate unless they change architecture, user-facing behavior, governance, memory policy, security, data, or multi-step plans.

## Review Loop Stop Rule

After two review-fix cycles on the same phase, continue only for Critical or High findings. Convert Medium and Low findings into follow-up work unless the Human Owner explicitly asks to keep hardening.

- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

New findings outside the approved phase scope become follow-ups unless they reveal Critical or High risk. Record review cycle count, remaining findings, follow-up location, and any user request for continued hardening in the phase completion artifact.
