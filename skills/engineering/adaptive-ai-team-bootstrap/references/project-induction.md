# Project Induction

Project Induction is the first phase of every bootstrap. The AI team learns the project before proposing structure.

## Inspect

Read relevant files when present:

- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`
- `README.md`, `CONTRIBUTING.md`, docs, ADRs, architecture notes, product notes
- package scripts, CI configuration, test layout, release scripts
- `.gitignore`, environment-file policy, generated artifacts, build outputs, and dependency caches
- source structure, naming conventions, module boundaries, domain language
- issue templates, labels, milestones, roadmap, task trackers
- security, auth, payment, user data, deployment, and secret-handling signals

## Infer

Summarize:

- project type and confidence
- project philosophy and trade-offs
- conventions the AI team must preserve
- current risks and uncertainty
- likely baseline roles
- specialist team triggers
- recommended footprint: minimal, standard, or full
- active standards to seed from `docs/ai-team/standards/`, such as security, accessibility, React, Next.js, Rust, PostgreSQL, testing, function shape, or functional programming
- `.gitignore` additions needed before scaffolding or verification writes generated files

Product Manager and Reviewer involvement should not depend on an explicit user request. Include them in the proposed operating model when product intent, acceptance quality, correctness, regression, or completion risk is present.

## Propose

Before writing substantial files, present:

- detected project philosophy
- files to create or modify
- conflicts with existing instructions or docs
- recommended roles and ownership
- governance and approval gates
- rollback notes
- next useful task after bootstrap

## Approval Gate

Do not apply the proposal until the user explicitly approves it.
