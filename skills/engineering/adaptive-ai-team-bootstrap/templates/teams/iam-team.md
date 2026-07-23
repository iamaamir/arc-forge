# IAM Team Charter

Template-Version: adaptive-ai-team-bootstrap@0.1.0

## Team Name

IAM Team

## Mission

Protect identity, authentication, authorization, permissions, secrets boundaries, and access-control review.

## Scope

- Authentication, authorization, role and permission modeling, session handling, and access-control review.
- Secret-handling boundaries, credential exposure risks, and identity-provider integration concerns.

## Non-Scope

- General product prioritization, unrelated UI polish, and non-IAM data model changes.
- Security topics that do not affect identity, access, secrets, or permission boundaries.

## Owner

- Assigned by Human Owner during approval.

## Owned Domains Or Files

- Authentication and session flows.
- Authorization policies, role definitions, permission checks, and access-control tests.
- Secret-handling documentation and identity-provider integration notes.

## Roles

- Team owner: Assigned by Human Owner during approval.
- Specialist reviewer: Domain specialist responsible for quality gates.
- Implementer liaison: Implementer assigned through the active task brief.

## Quality Gates

- Auth flows reviewed.
- Permission boundaries documented.
- Secrets are not stored in docs, memory, logs, or examples.
- High-risk IAM changes receive human approval.

## Dependencies

- Product Lead, Staff Engineer, Implementer, Reviewer, QA/Verification, and Docs/Memory Steward.
- Security, platform, compliance, and collaboration teams when access controls intersect their domains.

## Escalation Rules

- Escalate high-risk IAM changes, secret exposure, or unresolved access-control conflicts to Human Owner.
- Escalate architecture boundary disputes to Staff Engineer.

## Scaling Trigger

- Activate when evidence shows repeated IAM changes, permission regressions, audit needs, or identity-provider integration work.

## Retirement Criteria

- Collapse or deactivate when IAM risk is stable, ownership is clear, and active access-control work returns to baseline roles.
