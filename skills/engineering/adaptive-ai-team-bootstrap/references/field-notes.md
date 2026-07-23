# Field Notes

Real project trials should feed back into this skill. Record observations as evidence, not as immediate rules. Promote a note into templates, scripts, or required workflow only after it repeats or exposes a serious safety/usability gap.

## TeamFlow Lite Trial: 2026-07-23

Project path: `/Users/mak/git/TeamFlow`

### What Worked

- The skill produced adapted project artifacts instead of copying raw templates.
- `constitution.md` captured the requested philosophy: lightweight, calm, transparent, minimal process, strong auditability.
- `Memory.md` became useful quickly, with source/date/confidence/scope/review status columns.
- The agent created useful product and architecture artifacts: `docs/ai-team/mvp-scope.md` and `docs/adr/001-core-data-model-and-tech-stack.md`.
- Specialist teams were avoided initially, matching the project's minimal-process philosophy.

### Friction Observed

- The user had to explicitly ask the agent to involve a Product Manager.
- The user had to explicitly ask for team peer review.
- Subagent spawning behavior is not explicit enough. A runtime may spin generic agents instead of specialized agents unless the skill tells it to pass a role card or specialist brief into each subagent prompt.
- Users want power to edit role cards to add specialization, local style, and personality without changing the whole operating model.
- Users also want editable engineering doctrine cards for coding standards, style, design patterns, framework best practices, language philosophies, and personal/team preferences. Examples: functional programming style, two-argument function limits, React-specific patterns, Rust safety idioms, or project-specific DSA/data-modeling preferences.
- `docs/ai-team/specialist-teams.md` was missing even though the validator expected it.
- `Memory.md` contained a malformed Architecture Memory table: header/separator column mismatch.
- Product and architecture docs drifted: MVP included `request_changes` as a vote value, while ADR vote enum initially listed only `approve`, `reject`, `abstain`.
- Status terminology drifted: ADR introduced `withdrawn`, while original product/status memory focused on `draft`, `open`, `approved`, `rejected`, `superseded`.
- `workflow.md` used older completion-approval wording and omitted the decision-rights matrix condition.
- `Product Manager` appeared in `team.md` but not in `decision-rights.md`.
- The agent moved from Phase 1 to Phase 2 automatically, before the user explicitly requested phase progression. This may be appropriate for autonomous execution, but the workflow should require phase-boundary reporting and approval when phases are substantial.
- `.ai-team/` runtime directories existed, but no task briefs, reviews, handoffs, or logs were written during Phase 1. The team OS artifacts were not used as an operational trace.
- Phase 1 produced app code, but verification showed it was not buildable: `npm run build` failed on PostCSS config, and `npx tsc --noEmit` failed on Drizzle/Auth.js typing issues.
- `npm run lint` invoked deprecated interactive `next lint`, which blocks non-interactive agent verification.
- `docs/plans/2026-07-23-teamflow-lite-mvp.md` prescribed stack/API details that later drifted from implementation and docs, including vote/status enums.
- Core critique from user: if the human or an outside observer has to stop the agent and ask it to fix basic phase-completion failures, the AI team is not yet operating as a reliable team. V1 created structure, but did not make the structure blocking.
- The team roles were present conceptually, but Reviewer, QA/Verification, and Staff Engineer did not visibly block phase progression when verification failed.
- The agent appeared to roleplay the process rather than leave inspectable operating evidence that the process was actually followed.
- After Phase 6, app source existed and `npm run build` passed, but the AI-team validator still failed because `docs/ai-team/specialist-teams.md` was missing.
- After Phase 6, `.ai-team/` still contained no task briefs, review reports, handoffs, or logs, despite the project having substantial multi-phase implementation work.
- The project was initialized as a git repo without a `.gitignore`, leaving `.env.local`, `.next/`, `node_modules/`, agent skill installs, and generated cache files visible as untracked content.
- `npx tsc --noEmit` passed after build generated `.next/types`, but a concurrent `build` + `tsc` run produced transient missing `.next/types` errors. Verification commands should be ordered to avoid generated-type races.
- `npm run lint` still used deprecated interactive `next lint`, so the project had no reliable non-interactive lint command even after all phases.
- Phase plan checkboxes remained unchecked even though implementation progressed through Phase 6, making plan state unreliable as a trace.
- Build success did not imply product correctness. Manual inspection found likely behavior/security issues: some workspace/decision queries rely on IDs without workspace scoping at call sites, RLS helpers exist but are not visibly applied around queries, and revalidation uses broad wildcard-like paths.

### Candidate Improvements

- Project Induction should proactively consider whether a Product Manager advisory role is useful for product-shaped projects.
- Project Induction should propose peer review as a default for product, architecture, and governance artifacts, not only code changes.
- Add role routing rules: when a task needs subagents, choose the most relevant role or specialist card first, then pass that role card into the subagent prompt.
- Add default specialist role cards such as UX/UI Specialist, Frontend Engineer, Backend Engineer, Security/IAM Reviewer, SEO Specialist, Collaboration/Realtimes Specialist, Infra/DevOps Specialist, and Data/Analytics Specialist.
- Treat role cards as user-editable: the user can tune responsibilities, tone, personality, decision style, review strictness, and domain preferences without changing the core workflow.
- Add stack/style doctrine cards under a standards or playbooks directory. These should be activated by Project Induction and task context, not loaded globally for every task.
- Make user-approved coding philosophy enforceable through review: if a task touches relevant files, the Reviewer should check the activated doctrine cards and report violations.
- Keep doctrine cards editable so the project can adopt user style without changing the base skill. Candidate cards: `universal.md`, `functional-programming.md`, `function-shape.md`, `react.md`, `nextjs.md`, `rust.md`, `postgres.md`, `testing.md`, `security.md`, `accessibility.md`.
- `check-ai-team.mjs` should detect required-file omissions, Markdown table column mismatches, cross-doc enum/status inconsistencies, role/decision-right drift, and workflow wording drift.
- Bootstrap completion should always run the validator and fix failures before claiming the AI-team footprint is ready.
- Task execution should require `.ai-team/tasks/` task briefs and `.ai-team/reviews/` review reports for each substantial phase, so the operating model leaves an inspectable trace.
- Phase transitions should be explicit: summarize completed work, verification evidence, open risks, memory updates, and ask for approval before starting the next substantial phase.
- Project Induction should recommend non-interactive verification commands. For Next.js projects, avoid `next lint` as the only lint command because it can prompt interactively in newer Next versions.
- Validators should include build/typecheck/lint command results in phase review, not only AI-team artifact checks.
- Make phase gates mandatory and blocking: no Phase N -> Phase N+1 transition without task brief, review report, verification evidence, memory-update decision, and explicit next-phase approval when the phase is substantial.
- Add a phase completion protocol template requiring: built artifacts, commands run, failures, review findings, unresolved risks, memory updates, and approval request for the next phase.
- Strengthen Reviewer and QA/Verification roles so failed build/typecheck/validator checks automatically mark the phase blocked.
- Validator should detect process bypass: no active task brief, no review report, missing verification evidence, phase marked complete despite failed checks, or phase progression without approval.
- Prioritize enforcement over more roles in the next revision. The system needs fewer theatrical roles and more unavoidable gates.
- Bootstrap for new projects should create or propose a `.gitignore` suitable for the detected stack before app scaffolding begins.
- The phase validator should require runtime trace artifacts to match phase claims: if Phase 6 is complete, there should be six task/review records or one consolidated phase report with evidence per phase.
- Verification ordering should be explicit for frameworks with generated types: run build before standalone `tsc` when `tsconfig.json` includes `.next/types`.
- The framework playbook should reject interactive verification scripts and require non-interactive commands for agents.

### Promotion Criteria

Promote these notes into the skill when at least one is true:

- TeamFlow implementation confirms the same issue during app scaffolding or first feature work.
- Another project trial repeats the issue.
- The issue creates a false completion claim, broken validator result, or governance ambiguity.

## TeamFlowV2 Activation Trial: 2026-07-24

Project path: `/Users/mak/git/TeamFlowV2`

Prompt under test:

```text
/adaptive-ai-team-bootstrap

I want to build a very basic Trello-like app.
```

### Friction Observed

- The invoking agent treated the app idea as permission to run generic planning/scaffolding instead of treating it as context for AI-team induction.
- The agent created a nested Next app at `teamflow/` and generic `docs/superpowers/` spec/plan files, but did not create `docs/ai-team/` or `.ai-team/` artifacts.
- The generated app had a generic Next.js `AGENTS.md`, so a presence-only checker could not distinguish unrelated agent instructions from the adaptive AI-team entrypoint.
- The copied skill install directories were the only files in the parent project at first. Induction sampled `.agents/skills/...` and inferred project test signals from the skill's own tests.

### Promoted Improvements

- Bare skill invocation must own the workflow immediately. App ideas in the same prompt are induction context, not implementation approval.
- Project Induction must ignore installed skills, agent caches, framework caches, dependency directories, and `skills-lock.json`.
- Root selection must be explicit when the current directory is empty, skill-install-only, or contains nested app candidates.
- `check-ai-team.mjs` must validate that `AGENTS.md` contains the adaptive AI-team marker, not merely that the file exists.

### Rerun After Activation Hardening

- Reinstalled the updated copied skill into cleaned `/Users/mak/git/TeamFlowV2` and reran the same bare invocation prompt.
- The agent created the adaptive AI-team footprint at the project root instead of scaffolding a nested app.
- Generated root files: `AGENTS.md`, `.gitignore`, `skills-lock.json`, `docs/ai-team/*`, `.ai-team/{logs,reviews,tasks}`.
- `AGENTS.md` contained `Template-Version: adaptive-ai-team-bootstrap@0.1.0`, so marker validation can distinguish it from unrelated generic agent instructions.
- `docs/ai-team/constitution.md` captured the Trello-like app as project mission and adapted philosophy/non-negotiables for a plain HTML/CSS/JS implementation.
- `docs/ai-team/Memory.md` captured source/date/confidence/scope/review-status metadata and kept inferred architecture facts pending.
- Fresh validator run from `/Users/mak/git/TeamFlowV2` passed: `node ".agents/skills/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs" --project .`.
- Runtime trace directories were empty after bootstrap, which is acceptable for induction-only setup but should be revisited if the next app-building phase claims substantial progress without task, review, or verification artifacts.

### First App Version Check

- After the initial static app version appeared, root app files existed: `index.html`, `style.css`, and `app.js`.
- Fresh `check-ai-team.mjs` failed because `team.md` added `UX/UI Designer`, but `decision-rights.md` did not mention that role.
- `.ai-team/tasks`, `.ai-team/reviews`, and `.ai-team/logs` were still empty despite app implementation work, so the operating trace did not show task brief, review, or verification evidence.
- `node --check app.js` produced no syntax errors.
- Manual source inspection found stale drag-drop affordance code: CSS and JS reference `.card-drop-zone`, but `app.js` never creates that element, so drop-zone highlighting cannot appear.
- Constitution-required evidence was not present in artifacts: manual CRUD testing, code review before done claim, and browser demo evidence were documented as required but not recorded.

### Runtime-Neutral Path Note

- In a later TeamFlowV2 trial, generated `workflow.md` referenced `.claude/skills/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs` while the same project also had `.agents/skills/...` and other runtime install paths.
- Hardcoding one runtime path in generated docs may confuse agents running under OpenCode, Qwen, Goose, Claude, or Pi even when the checker exists elsewhere.
- Candidate improvement: make generated command guidance runtime-neutral, such as "run the checker from the installed skill path for your runtime" with examples for `.agents/skills`, `.claude/skills`, `.qwen/skills`, `.goose/skills`, and `.pi/skills`, or have templates prefer a wrapper path under `.ai-team/bin/`.
