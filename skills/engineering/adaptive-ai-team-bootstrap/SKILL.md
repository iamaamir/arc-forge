---
name: adaptive-ai-team-bootstrap
description: "Bootstrap an Adaptive AI Team Operating System into a new or existing project. Use when the user wants an AI product-engineering team, project-specific agent roles, durable Memory.md, specialist teams, governance, task workflows, or proposal-first AI-team scaffolding."
---

# Adaptive AI Team Bootstrap

Install an adaptive AI product-engineering team into a project without forcing generic process onto local project culture.

Public promise:

> Drop an adaptive AI product-engineering team into any project.

## Use When

- The user wants an AI team, agent organization, or project operating model.
- The user wants roles such as Product Lead, Staff Engineer, Reviewer, QA, Security, IAM, SEO, Collaboration, Docs, or Release.
- The user wants durable cross-session continuity through `Memory.md`.
- The user wants project-specific `AGENTS.md` guidance.
- The user wants to scale from a lean AI team into specialist subteams.
- The user wants safer, more structured alternatives to fixed loop engineering.

## Do Not Use When

- The user asks for one small code edit and no persistent team structure.
- The repository already has a complete AI-team operating model and the user did not ask to change it.
- The task is a direct bug fix, code review, or documentation edit that should use a narrower skill.
- The user explicitly says not to create or propose project scaffolding.

## Hard Rule: Project Induction First

Before creating or modifying project artifacts, perform Project Induction:

1. Inspect existing instructions, docs, code structure, tests, CI, and project conventions.
2. Infer the project's philosophy, risks, scale, and operating style.
3. Present an induction proposal with the recommended footprint, roles, files, risks, conflicts, and approval gates.
4. Wait for explicit user approval before applying substantial changes.

Substantial changes include creating or modifying `AGENTS.md`, `docs/ai-team/`, `.ai-team/`, role cards, specialist team packs, governance rules, memory policy, or any project instructions that affect future agent behavior.

Even fresh projects receive a proposal. Existing projects must never be force-scaffolded.

## Bare Invocation Contract

If the user invokes `/adaptive-ai-team-bootstrap` or names this skill with a project idea, this skill owns the workflow immediately. Treat the project idea as induction context, not approval to plan, scaffold, install packages, write app code, or commit.

Example:

```text
/adaptive-ai-team-bootstrap

I want to build a very basic Trello-like app.
```

Required interpretation: run Project Induction for an adaptive AI team first. Do not route to generic PRD, planning, TDD, or app scaffolding before the AI-team footprint decision.

First response shape:

1. State: "I’m running Project Induction for an adaptive AI team."
2. State that the app idea is context for shaping the team.
3. State that no AI-team files or app code will be written before footprint approval.
4. Inspect the repository and present the induction proposal.

## Root Selection Rule

If the current directory is empty, contains only installed skills/agent cache files, or contains nested app candidates, ask where the AI team should be installed before applying the footprint:

- current directory
- nested app directory
- both

Do not apply a footprint until the root decision is explicit.

## Operating Pillars

1. **Induction and fit**: learn the project before proposing structure.
2. **Team operating model**: baseline roles, role hiring, specialist teams, ownership, scaling triggers.
3. **Memory and governance**: `Memory.md`, constitution, decision rights, risk gates, no-secrets policy.
4. **Execution and verification**: task briefs, handoffs, reviews, evidence before completion.

## Required Reading

Load only the references needed for the current phase:

Load references by phase: induction before proposals, operating model for task flow, memory policy before durable memory changes, governance for risk decisions, and scaling model before adding roles or teams.

- [Project Induction](references/project-induction.md)
- [Operating Model](references/operating-model.md)
- [Memory Policy](references/memory-policy.md)
- [Governance](references/governance.md)
- [Scaling Model](references/scaling-model.md)
- [Field Notes](references/field-notes.md) when improving the skill from real project trials

## Default Footprint

The proposal may recommend a minimal, standard, or full footprint.

Root:

- `AGENTS.md`: short entrypoint and precedence rules.

Durable docs:

- `docs/ai-team/constitution.md`
- `docs/ai-team/Memory.md`
- `docs/ai-team/team.md`
- `docs/ai-team/workflow.md`
- `docs/ai-team/decision-rights.md`
- `docs/ai-team/ownership.md`
- `docs/ai-team/governance.md`
- `docs/ai-team/specialist-teams.md`

Runtime state:

- `.ai-team/tasks/`
- `.ai-team/proposals/`
- `.ai-team/reviews/`
- `.ai-team/handoffs/`
- `.ai-team/logs/`

## Helper Scripts

Scripts are dependency-free Node helpers bundled with this skill:

```sh
node skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.mjs --project . --dry-run
node skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs --project .
node skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs --project . --require-runtime-trace
node skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs --project . --title "Improve onboarding"
node skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs --project . --title "Ship auth review" --phase "Security review" --standards universal,security,testing
node skills/engineering/adaptive-ai-team-bootstrap/scripts/complete-phase.mjs --project . --phase "Security review" --task .ai-team/tasks/auth.md --review .ai-team/reviews/auth.md --review-verdict "approve" --verification .ai-team/logs/auth-verification.md --memory "updated" --risks "none open" --next "release approval" --approval "ask Human Owner before release"
node skills/engineering/adaptive-ai-team-bootstrap/scripts/hire-agent.mjs --project . --role "Security Reviewer" --dry-run
node skills/engineering/adaptive-ai-team-bootstrap/scripts/new-specialist-team.mjs --project . --team "IAM" --dry-run
```

The scripts support repeatable scaffolding, but the skill's proposal-first rule remains authoritative.

## Blocking Phase Gates

Every substantial phase boundary needs a task artifact, review artifact, verification evidence, memory update decision, unresolved-risk summary, and next-phase approval request. Small reversible tasks still need evidence before completion, but they do not require full phase-gate paperwork unless they change architecture, user-facing behavior, governance, memory policy, security, data, or multi-step plans.

Failed verification or a blocking review verdict blocks progression unless the Human Owner explicitly waives the failure. Record the waiver, approver, reason, and remaining risk before moving forward.

Use `complete-phase.mjs` to create the phase completion artifact. The helper refuses `--status success` when verification text reports failure unless `--waived-by` is supplied.

After any implementation phase that creates or changes project source files, run `check-ai-team.mjs --require-runtime-trace` before claiming completion. This strict mode fails when project source files exist but task, review, or verification-log artifacts are missing, which helps weaker models catch process bypass instead of relying on memory.

## Review Loop Stop Rule

After two review-fix cycles on the same phase, continue only for Critical or High findings. Convert Medium and Low findings into follow-up work unless the user explicitly asks to keep hardening.

- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

New findings outside the approved phase scope become follow-ups unless they reveal Critical or High risk. Record the loop stop decision in the phase completion artifact: review cycle count, remaining findings, follow-up location, and whether the user requested continued review.

## Role Routing

Route work to the smallest set of roles that can protect the outcome. Product Manager and Reviewer involvement should not depend on the user asking explicitly; activate them when scope, acceptance, correctness, regression, or completion risk is present.

Before dispatching a subagent, select the relevant role card from `docs/ai-team/roles/` or `templates/roles/` and include a concise role brief in the prompt. If the runtime only supports generic subagents, specialize the prompt. If subagents are unavailable, simulate the role sequentially and write the role output to the task or review artifact.

Specialist roles join only when their trigger is present, and their authority is limited to their role card and approved task brief.

## Active Standards

Every task brief names the standards in force for that task. Default to `universal,user-style,testing`; add domain standards such as `security`, `accessibility`, `react`, `nextjs`, `postgres`, `rust`, `functional-programming`, or `function-shape` when the work touches those areas.

Reviewers check active standards directly, not only the task's custom acceptance criteria.

## Precedence

When guidance conflicts, follow this order:

1. Direct user instruction.
2. Repository instruction files.
3. Approved `docs/ai-team/constitution.md`.
4. ADRs and durable docs.
5. Code and tests as implemented reality.
6. `docs/ai-team/Memory.md`.
7. Role/team defaults.
8. This skill's general guidance.

## Safety Rules

- Never silently overwrite existing project instructions or docs.
- Never write secrets to `Memory.md`, docs, logs, task briefs, screenshots, or examples.
- Mark inferred facts as inferred until confirmed.
- Require human approval for high-risk changes, constitution changes, memory policy changes, and specialist team creation.
- Completion claims require evidence or an explicit caveat.
