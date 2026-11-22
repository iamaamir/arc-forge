---
name: stepwise
description: >-
  Guided, stage-by-stage engineering workflow. Use when the user explicitly asks
  for Stepwise, guided implementation, or an approval checkpoint after every
  engineering stage. Investigate, design, implement, verify, and review a coding
  task, pausing after each stage for user approval before proceeding.
---

# Stepwise — guided engineering

Use this skill when the user requests **Stepwise**. This is a collaboration protocol, not a prescribed architecture or a special evaluation experiment.

## Operating contract

- Follow repository instructions, documented engineering decisions, and the user's task requirements. The skill does not replace them.
- Keep a concise record of the **current stage**, evidence, completed work, remaining risks, and the user's approvals. On resumption, continue from the last approved checkpoint; do not rerun stages without reason.
- **Stop at the end of each of Stages 1–4**. Report the result and ask for approval to begin the next stage. Never infer approval from silence or a prior generic request to "implement".
- In Stages 1–2, do not modify source code, commit, open a PR, or perform destructive operations. Read-only investigation and non-destructive reproduction are allowed.
- Distinguish observed facts, hypotheses, and unverified claims. Do not claim tests ran without actual outputs.
- Do not merge, deploy, publish, or perform irreversible actions without explicit authorization.
- If an important assumption fails or the task must change materially, stop, explain the new decision, and obtain approval.
- Do not add process artifacts, templates, or bureaucracy unless the task/repository requires them. Prefer the smallest complete, maintainable solution.

## Stage 1 — Investigate (then STOP)

Inspect the task, relevant source, tests, documentation, configuration, and previous engineering decisions. Reproduce the bug or establish current behavior when practical. Identify the root cause or competing hypotheses, constraints, affected paths, and unknowns.

**Return:** What is known and how it was verified; what remains uncertain; affected code; an initial risk assessment. Ask: **"Approve Stage 2 — design?"**

## Stage 2 — Design and challenge (then STOP)

Evaluate reasonable solutions, including a smaller or no-change option when appropriate. Recommend one design and explain its tradeoffs, security/trust boundaries, change scope, edge cases, and rollback implications. Define acceptance criteria and the tests that could **disprove** success. Challenge your own recommendation.

**Return:** Proposed approach, alternatives, risks, precise implementation boundaries, verification plan, open decisions. Ask: **"Approve Stage 3 — implementation of this plan?"**

## Stage 3 — Implement (then STOP)

Implement the approved design in focused changes. Protect unrelated behavior and repository invariants. Add or update relevant tests. Record meaningful deviations and their justification. Do not silently broaden the plan.

**Return:** Files/behavior changed, implementation status, what is not yet tested, and any blockers. Ask: **"Approve Stage 4 — verification?"**

## Stage 4 — Verify (then STOP)

Run applicable tests and project gates. Exercise normal cases, edge cases, failures, and regression boundaries. For consequential behavior, include executable negative or fault-injection controls where feasible. Compare expected and observed results; record the revision checked. Treat missing coverage as unverified, not passed.

If a fix requires materially changing the approved implementation, return to Stage 2 or Stage 3 with approval. Do not silently fix problems while describing Stage 4 as read-only verification.

**Return:** Commands actually run, results, failures, gaps, and an evidence-based readiness assessment. Ask: **"Approve Stage 5 — review and delivery?"**

## Stage 5 — Review and deliver (finish)

Critically review correctness, security, architecture, maintainability, unneeded complexity, and test quality. A self-review is **not an independent review**. Report findings; request authorization before material remediation outside the approved scope. Where permitted, prepare a review-ready commit or PR and cite exact revision and verification evidence.

**Return:** Result, changed files/commits, evidence, residual risks, and whether an independent review is advised. **Do not merge or deploy.**

## Response style

Be concise and decision-focused. Do not ask repeated per-category questions. One clear approval request at each checkpoint is sufficient.
