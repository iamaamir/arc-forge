---
name: gauntlet
description: "Run a deterministic 5-stage quality gauntlet for coding tasks: convert requirements into Gherkin acceptance tests, code against them, refactor until CRAP scores pass, harden tests with mutation testing, then run system-level QA. Use when building features where quality matters, when told to 'run the gauntlet', or when steering-by-prompt has produced messy agent code."
---

# The Gauntlet

Deterministic gates over prompt steering. Agents treat prose as guidelines but cannot ignore an exit code. Every stage ends in a command that either passes or fails loudly. Loop until it passes.

## Stages

| # | Stage | Output | Gate |
|---|-------|--------|------|
| 1 | Specify | Gherkin acceptance tests + QA procedure | user approves |
| 2 | Code | implementation + unit tests | `forge-gate check --spec` |
| 3 | Clean | refactored code | `forge-gate check --crap` |
| 4 | Harden | mutation-hardened tests | `forge-gate check --mutation` |
| 5 | QA | verified system behavior | `forge-gate check --qa` |

Read the reference playbook for the current stage before acting. Only that playbook — keep context small.

## Execution model

If subagents are available, dispatch a fresh subagent per stage with only: the requirement, the state artifact, and that stage's playbook. Otherwise run stages sequentially yourself, re-reading each playbook when entering it.

## State tracking

At the start, copy `templates/gauntlet-state.md` to `gauntlet-state.md` in the target project. After each gate passes, update it. On resume, start from the last passed gate — never redo approved work.

## Non-JS/TS projects

Use the `forge-gate` package for JavaScript (install it or run it via npx). For other ecosystems, keep the same stage structure but substitute ecosystem tools: complexity+coverage analyzers for the CRAP gate, `mutmut`/`cargo-mutants`/etc. for mutation. The `forge-gate` CLI cannot parse non-JS code, so run the substituted commands directly and track them and their results in `gauntlet-state.md`. Never skip a gate because tooling is inconvenient — pick an equivalent tool instead.

## Rules

1. Do not start stage 2 before the user approves the stage-1 Gherkin spec.
2. Messiness is allowed in stage 2. It is what stages 3–4 exist to remove.
3. A failing gate means loop: fix and re-run the same gate. Do not proceed past a red gate, do not raise thresholds without asking the user.
4. No big upfront design documents. The Gherkin spec plus QA procedure is the entire written plan.
