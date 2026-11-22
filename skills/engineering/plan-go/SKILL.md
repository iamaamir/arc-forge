---
name: plan-go
description: >-
  PlanGo engineering workflow with one mandatory approval checkpoint. Use when
  the user explicitly requests PlanGo, plan-then-execute, or to investigate and
  propose a plan before autonomous implementation. Investigate and design, STOP
  for approval, then implement, verify, and self-review without routine pauses.
---

# PlanGo — plan, approve, execute

Use this skill when the user requests **PlanGo**. This is an engineering delivery workflow, not a special agent evaluation or a license to change requirements without approval.

## Operating contract

- Follow the user's task, repository instructions, existing contracts, and applicable safety/quality gates.
- Complete **Stages 1 and 2 only** before approval. No source edits, commits, pull requests, or other implementation changes are permitted in the planning phase; non-destructive investigation or reproductions are allowed.
- **STOP after Stage 2.** Present a concrete plan and ask for explicit approval. Do not continue in the same response or treat the user's original task as approval of the plan.
- After the user approves the plan, execute **Stages 3, 4, and 5 autonomously**. Do not request routine approvals for tests, ordinary fixes within scope, or progression between these stages.
- If the plan needs material changes, the trust/security boundary shifts, a harmful/irreversible action is needed, or necessary permissions are missing, stop with the decision and alternatives. Resume only after approval.
- Do not merge, deploy, publish, or take irreversible actions unless separately and explicitly authorized.
- Treat reported test results as evidence only if actually run. Label assumptions, missing coverage, and unavailable tools explicitly.
- Optimize for correctness, simplicity, and extensibility rather than file count, complexity, or elaborate plans.

## Stage 1 — Investigate

Read the task and relevant implementation, tests, docs, and previous decisions. Establish behavior, reproduce the issue when feasible, identify root cause or justified hypotheses, constraints, risks, and unknowns. Ground observations in code or executable evidence.

## Stage 2 — Design and challenge (mandatory STOP)

Assess alternatives, including smaller solutions. Choose the smallest complete design and explain why. Explicitly cover: changes and non-goals, impact on architecture and security/trust boundaries, existing contracts, migration/rollback needs, and acceptance criteria. Specify executable positive and negative verification. Challenge your plan and highlight genuinely unresolved decisions.

**Return a concise approval packet:**
1. Findings and root cause (facts vs assumptions).
2. Recommended design and why alternatives were rejected.
3. Planned changes, boundaries, and major risks.
4. Verification strategy and specific failure controls.
5. A direct question: **"Approve this plan and authorize Stages 3–5?"**

**Stop. Do not implement yet.**

## Stage 3 — Implement (after approval)

Build the approved change, update tests and docs as necessary, and avoid unrelated edits. Make meaningful intermediate checkpoints when practical. Correct defects within the approved design without seeking additional permission. Material departures require a new approval.

## Stage 4 — Verify

Run relevant tests and project quality gates. Validate happy paths, boundary cases, regressions, and failure modes, including executable negative/fault-injection controls for consequential changes where feasible. Record the exact revision, commands, observed results, and unverified gaps. Investigate and fix confirmed defects within the approved scope; rerun affected checks.

## Stage 5 — Review and deliver

Conduct a critical self-review for correctness, security, architecture, maintainability, unnecessary complexity, and missing tests. Self-review is not independent review. Fix confirmed issues within scope and re-verify. Provide a concise final handoff with changed files, final commit/PR if created, evidence, known risks, and recommended independent review when consequential.

**Do not merge or deploy.**

## Resume behavior

An explicit approval of the plan means continue from Stage 3. If the user declines or requests changes, revise Stage 2 and stop again. Do not restart investigation unless the task or evidence materially changed.
