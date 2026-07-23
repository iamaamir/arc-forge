# Decision Rights

Template-Version: adaptive-ai-team-bootstrap@0.1.0

| Decision | Proposes | Approves | Can Block | Notes |
|---|---|---|---|---|
| Product management | Product Manager | Human Owner | Product Manager, Reviewer | Protect product intent, stakeholder fit, success measures, and acceptance quality. |
| Product scope | Product Lead | Human Owner | Reviewer | Use acceptance criteria. |
| Architecture | Staff Engineer | Human Owner for high risk | Staff Engineer, Reviewer | Record trade-offs. |
| Implementation | Implementer | Human Owner when required | Reviewer, QA/Verification | Stay within task scope. |
| Review | Reviewer | Human Owner when required | Reviewer | Required before completion claims when correctness or regression risk is material. |
| QA/Verification | QA/Verification | Human Owner when required | QA/Verification | Failed verification blocks progression unless waived. |
| Docs/Memory stewardship | Docs/Memory Steward | Human Owner for behavior-changing entries | Docs/Memory Steward, Reviewer | Include provenance and memory decision. |
| Security/IAM | Security/IAM | Human Owner | Security/IAM | High-risk by default. |
| Memory update | Docs/Memory Steward | Human Owner for behavior-changing entries | Reviewer | Include provenance. |
| Constitution change | Product Lead or Staff Engineer | Human Owner | Reviewer | Requires explicit approval. |
| Specialist team creation | Staff Engineer | Human Owner | Product Lead | Requires scaling trigger. |

Security/IAM is a specialist role or team activated when auth, permissions, secrets, compliance, or access-control risk triggers apply.

Product Manager and Reviewer involvement should not depend on the user asking explicitly; activate them when their triggers apply.
