# Governance

Template-Version: adaptive-ai-team-bootstrap@0.1.0

## Risk Classes

- Low: docs, small reversible edits, local-only proposals.
- Medium: code changes, dependency updates, non-sensitive config, behavior changes.
- High: auth, IAM, secrets, data model, production deploy, payments, security, legal/compliance, user data, public API, irreversible migrations, constitution changes, memory policy changes.

## Approval Gates

- Substantial or high-risk work requires proposal approval before role work begins.
- Completion approval is required when the task risk class or decision rights matrix requires it.
- High-risk actions require explicit human approval before execution.
- Substantial phase progression requires task, review, verification, memory-decision, unresolved-risk, and next-approval artifacts.
- Failed verification or a blocking review verdict blocks progression unless the Human Owner explicitly waives it.
- After two review-fix cycles on the same phase, only Critical and High findings continue to block. Medium and Low findings become follow-up work unless the Human Owner requests continued hardening.

## Finding Severity

- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

Product Manager and Reviewer involvement should not depend on the user asking explicitly; activate them when their triggers apply.

## Secrets Policy

Do not store secrets in docs, memory, logs, task briefs, screenshots, generated examples, or prompts.

## External Tools

Follow repository policy before installing packages, fetching external docs, calling APIs, or using networked services.
