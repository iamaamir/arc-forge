# Adaptive AI Team Bootstrap V2 Enforcement Design

Date: 2026-07-23

## Summary

Update `adaptive-ai-team-bootstrap` from a structured AI-team scaffold into an operating system with blocking enforcement. TeamFlow Lite proved that v1 can create useful docs and code, but agents can still bypass the operating model: phases advanced without task briefs, review reports, validation evidence, or complete AI-team artifacts.

V2 focuses on making the team impossible to ignore. It adds phase gates, runtime trace requirements, role routing, editable engineering standards, new-project hygiene, and stronger validation.

## Evidence From TeamFlow

TeamFlow showed useful behavior:

- Project artifacts were adapted to local philosophy.
- `Memory.md` preserved useful decisions and terminology.
- Product/architecture docs emerged early.
- Specialist teams were avoided until justified.
- The app eventually reached a buildable scaffold.

TeamFlow also exposed failures:

- The agent moved phase-to-phase without explicit phase-gate evidence.
- `.ai-team/` remained empty despite six substantial implementation phases.
- `docs/ai-team/specialist-teams.md` was missing while the validator expected it.
- Verification initially failed, but phase progression continued.
- `npm run lint` used deprecated interactive `next lint`.
- The project had no `.gitignore`, leaving `.env.local`, `.next/`, `node_modules/`, and agent install directories unignored.
- User had to explicitly ask for Product Manager involvement and peer review.
- Role cards and specialist behavior were not routed into subagent prompts by default.

Core lesson:

> V1 created structure, but did not make the structure blocking.

## Goals

- Prevent substantial phase transitions without evidence.
- Require `.ai-team/` runtime traces for substantial work.
- Make Reviewer and QA/Verification roles blocking when verification fails.
- Make role routing explicit for subagents and simulated roles.
- Add user-editable engineering doctrine cards for coding standards and project style.
- Improve new-project hygiene through `.gitignore` guidance/templates.
- Extend validation beyond file presence into process-bypass detection.

## Non-Goals

- Do not build a full workflow engine or daemon.
- Do not make every small task bureaucratic.
- Do not load every standards card into every task.
- Do not attempt deep semantic consistency checking for every enum/status in v2.
- Do not force specialist teams when a role card is enough.

## Design Changes

### 1. Blocking Phase Gates

Add a phase gate protocol for substantial phases. A phase is substantial when it creates or changes app architecture, data model, auth/security, user-facing behavior, project instructions, governance, memory policy, or a multi-step implementation plan.

Before moving from one substantial phase to the next, the agent must produce:

- `.ai-team/tasks/<phase-slug>.md`
- `.ai-team/reviews/<phase-slug>-review.md`
- verification command output summary
- memory update decision: updated, not needed, or blocked
- unresolved risks
- explicit approval request for the next phase unless the user has opted into autonomous phase progression

If build, typecheck, validator, or required review fails, the phase is blocked. The agent must not proceed to the next phase until the blocker is fixed or explicitly waived by the user.

### 1a. Review Loop Stop Rule

Add loop control so enforcement does not become open-ended review churn.

After two review-fix cycles on the same phase:

- Critical and High findings still block phase completion.
- Medium and Low findings become follow-up work unless the user explicitly requests continued hardening.
- New findings outside the approved phase scope become follow-ups unless they reveal security, data-loss, secret-exposure, broken-build, or clear requirement-failure risk.
- The phase completion artifact records a loop stop decision with cycle count, remaining findings, follow-up location, and whether the user requested continued review.

Severity definitions:

- Critical: data loss, secret exposure, security bypass, corrupts project state, or makes safe rollback impossible.
- High: broken build/test, clear requirement miss, validator bypass that defeats the phase goal, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.

This rule is part of the phase gate. It prevents agents from using review as an infinite expansion mechanism while preserving hard blockers.

### 2. Runtime Trace Enforcement

The runtime state becomes operational evidence, not optional storage.

Required runtime artifacts for substantial work:

- Task brief: scope, roles, risk, active standards, verification plan, done definition.
- Review report: findings, evidence checked, verdict, blockers, waivers.
- Verification log: commands run, status, failures, timestamp.
- Handoff: only required when changing agents, roles, or phases.

Low-risk tasks may use a single compact task/review artifact, but they still need evidence before completion.

### 3. Role Routing

Add role routing rules:

- Before spawning a subagent, choose the most relevant role card or specialist card.
- Include the selected role card or a concise role brief in the subagent prompt.
- If the runtime supports named specialists, use them.
- If it only supports generic subagents, specialize the prompt.
- If no subagents exist, simulate the role sequentially and write the role's output to the review/task artifact.

Default added role cards:

- Product Manager
- UX/UI Specialist
- Frontend Engineer
- Backend Engineer
- Security/IAM Reviewer
- SEO Specialist
- Collaboration/Realtimes Specialist
- Infra/DevOps Specialist
- Data/Analytics Specialist

Role cards are user-editable. Users can tune responsibilities, tone, personality, strictness, decision style, and domain preferences.

### 4. Engineering Doctrine Cards

Add stack/style standards under `templates/standards/` and generated projects under `docs/ai-team/standards/`.

Initial cards:

- `universal.md`
- `user-style.md`
- `functional-programming.md`
- `function-shape.md`
- `react.md`
- `nextjs.md`
- `rust.md`
- `postgres.md`
- `testing.md`
- `security.md`
- `accessibility.md`

Standards are activated by task context and Project Induction, not loaded globally. A task touching React UI should activate React, frontend, accessibility, and user-style standards. A Rust task should activate Rust and relevant API/error-handling standards.

The task brief must include an `Active Standards` section. The review report must include a `Standards Review` section.

### 5. New-Project Hygiene

For fresh projects, Project Induction must recommend a `.gitignore` before app scaffolding. The skill should include a generic `.gitignore` template plus stack-specific additions.

Minimum generated `.gitignore` guidance:

- `.env`
- `.env.*`
- `!.env.example`
- `node_modules/`
- `.next/`
- `dist/`
- `coverage/`
- `*.log`
- `tsconfig.tsbuildinfo`
- `.DS_Store`

Agent skill install/cache directories should be discussed during induction because some projects may want to commit local agent instructions but not installed skill bundles.

### 6. Validator Improvements

Extend `check-ai-team.mjs` to detect:

- Missing required durable docs, including `specialist-teams.md`.
- Markdown table header/separator column mismatches in AI-team docs.
- Roles present in `team.md` but missing from `decision-rights.md`.
- Substantial phase claims without matching task/review artifacts.
- Review artifacts without verification evidence.
- Deprecated or interactive verification commands, especially `next lint` in Next.js projects.
- Missing `.gitignore` in git repositories.
- Runtime files containing likely secrets.

Semantic cross-doc enum/status consistency is deferred unless implemented as a simple explicit checklist in review templates.

## Template Updates

Update existing templates:

- `templates/docs-ai-team/workflow.md`: add blocking phase gate language.
- `templates/docs-ai-team/governance.md`: make failed verification a blocker.
- `templates/runtime/task-brief.md`: add `Active Standards` and `Phase Gate` sections.
- `templates/runtime/review-report.md`: add `Standards Review`, `Verification Evidence`, `Blocking Verdict`, and `Next Phase Approval` sections.
- `templates/docs-ai-team/team.md`: include Product Manager as optional advisory role for product-shaped projects.

Add templates:

- `templates/runtime/phase-completion.md`
- `templates/runtime/verification-log.md`
- `templates/roles/product-manager.md`
- `templates/roles/ux-ui-specialist.md`
- `templates/roles/frontend-engineer.md`
- `templates/roles/backend-engineer.md`
- `templates/roles/security-iam-reviewer.md`
- `templates/roles/seo-specialist.md`
- `templates/roles/collaboration-realtimes-specialist.md`
- `templates/roles/infra-devops-specialist.md`
- `templates/roles/data-analytics-specialist.md`
- `templates/standards/*.md`
- `templates/gitignore/node.md`

## Script Updates

Update `init-ai-team.mjs`:

- Ensure `specialist-teams.md` exists as a template and is included in full footprint creation.
- Include standards directory in full footprint creation.
- Include `.gitignore` proposal/creation for fresh git projects when safe.
- Print post-bootstrap command: `check-ai-team.mjs --project .`.

Update `new-task.mjs`:

- Add `--phase` option.
- Add `Active Standards` section.
- Add phase-gate metadata.

Add `complete-phase.mjs`:

- Creates or updates phase completion artifact.
- Requires review report path, verification commands summary, memory-update decision, and next-phase recommendation.
- Refuses success status when verification failed unless `--waived-by <name>` is supplied.

Update `check-ai-team.mjs`:

- Add the validator improvements listed above.

## Success Criteria

- Skill discovery still lists `adaptive-ai-team-bootstrap`.
- `npm test` passes and includes adaptive script tests.
- A fresh bootstrap creates all required durable docs, including `specialist-teams.md`.
- `check-ai-team.mjs` fails when a git repo lacks `.gitignore`.
- `check-ai-team.mjs` fails when AI-team markdown tables have column mismatches.
- `check-ai-team.mjs` fails when `team.md` has a role absent from `decision-rights.md`.
- `check-ai-team.mjs` fails when a phase completion artifact claims success without review/verification evidence.
- `new-task.mjs --phase` creates task briefs with active standards and phase metadata.
- Role routing guidance is present in `SKILL.md` or references.
- Standards cards are generated but not globally loaded by default.

## Rollout Notes

This update should be applied in the isolated `adaptive-ai-team-bootstrap` worktree. The main workspace contains unrelated dirty files and should not be modified directly.

Do not delete `references/field-notes.md`; it remains the learning ledger for additional TeamFlow observations.
