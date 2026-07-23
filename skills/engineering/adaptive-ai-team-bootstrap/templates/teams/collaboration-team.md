# Collaboration Team Charter

Template-Version: adaptive-ai-team-bootstrap@0.1.0

## Team Name

Collaboration Team

## Mission

Protect multi-user workflows, realtime behavior, notifications, permissions interactions, concurrency, and conflict resolution.

## Scope

- Multi-user workflows, realtime state, notifications, concurrency, conflict resolution, and collaboration permissions.
- Presence, sharing, comments, activity feeds, and synchronized editing behavior when applicable.

## Non-Scope

- Single-user features with no shared state or notification side effects.
- Generic messaging, marketing communications, or permissions outside collaboration flows.

## Owner

- Assigned by Human Owner during approval.

## Owned Domains Or Files

- Realtime sync flows, shared-state models, conflict handling, and collaboration scenario tests.
- Notification side effects, presence behavior, sharing rules, and collaboration permission notes.
- Multi-user workflow documentation and operational runbooks.

## Roles

- Team owner: Assigned by Human Owner during approval.
- Specialist reviewer: Domain specialist responsible for quality gates.
- Implementer liaison: Implementer assigned through the active task brief.

## Quality Gates

- Multi-user state transitions reviewed.
- Race conditions and conflict handling considered.
- Notification and permission side effects reviewed.
- Manual or automated collaboration scenario tested when practical.

## Dependencies

- Product Lead, Staff Engineer, Implementer, Reviewer, QA/Verification, and Docs/Memory Steward.
- IAM, platform, notifications, data, and frontend teams when shared state crosses their domains.

## Escalation Rules

- Escalate high-risk data-loss, race-condition, permission, or unresolved workflow conflicts to Human Owner.
- Escalate synchronization architecture disputes to Staff Engineer.

## Scaling Trigger

- Activate when evidence shows repeated collaboration changes, concurrency defects, multi-user incidents, or realtime feature work.

## Retirement Criteria

- Collapse or deactivate when collaboration risks are verified, active multi-user work is complete, and baseline roles can own follow-up.
