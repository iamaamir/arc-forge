# Governance

## Risk Classes

- Low: docs, small reversible edits, local-only proposals.
- Medium: code changes, dependency updates, non-sensitive config, behavior changes.
- High: auth, IAM, secrets, data model, production deploy, payments, security, legal/compliance, user data, public API, irreversible migrations, constitution changes, memory policy changes.

## Approval Gates

High-risk actions require explicit human approval before execution.

Substantial phase gates require task, review, verification, memory-decision, unresolved-risk, and next-approval artifacts before work moves forward. Failed verification or a blocking review verdict blocks progression unless the Human Owner explicitly waives the failure.

Review loops stop after two review-fix cycles on the same phase unless Critical or High findings remain. Medium and Low findings become follow-up work unless the Human Owner explicitly requests continued hardening.

Severity levels:

- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

## Decision Rights

- Human Owner: final approval, overrides, constitution changes, high-risk changes.
- Product Manager: product intent, stakeholder fit, success measures, and acceptance quality.
- Product Lead: product scope proposals and acceptance criteria.
- Staff Engineer: architecture proposals and technical veto recommendations.
- Security/IAM: can block security-sensitive work until risks are resolved.
- Reviewer: can block completion claims when correctness, regression, or test risks remain.
- QA/Verification: can block completion claims without evidence.
- Docs/Memory Steward: can propose memory changes; behavior-changing memory requires approval.

Product Manager and Reviewer involvement should be automatic when their triggers apply; do not wait for the user to request those roles by name.

## Conflict Handling

1. Document the disagreement.
2. Identify the decision owner.
3. Present alternatives and trade-offs.
4. Escalate to the human owner when authority is unclear or risk is high.
5. Record the decision and reversal conditions.
