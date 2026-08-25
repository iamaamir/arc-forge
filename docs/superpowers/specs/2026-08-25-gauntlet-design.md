# Gauntlet Design

Date: 2026-08-25

## Summary

Add a deterministic quality pipeline for AI coding agents to Arc Forge, based on Uncle Bob's "Gauntlet" workflow. Agents are not trusted to follow prose instructions; instead, each pipeline stage ends in a deterministic tool whose exit code decides pass or fail, and the agent loops until the gate passes.

Two deliverables:

- `skills/engineering/gauntlet/SKILL.md` — the process skill that runs five adaptive stages.
- `packages/gauntlet/` — an npm workspace CLI (`gauntlet check`) that provides the deterministic gates.

## Goals

- Replace prompt-based steering with deterministic gates: every stage ends in a command that fails loudly.
- Keep each stage in a clean context (subagent when available) to avoid context dilution.
- Ship working JS/TS gates out of the box while letting agents adapt the same stage logic to any ecosystem.
- Dogfood: the `packages/gauntlet` package is built by running its own pipeline stages (spec first, then code, then clean, then mutation-harden).

## Non-Goals

- No multi-language mutator implementations in v1 (delegation only).
- No spec-driven-development features: no big upfront design documents, no waterfall planning artifacts.
- No CI integration beyond a plain exit code any CI can call.
- No changes to existing skills or packages.

## The Five Stages

| # | Stage | Role | Gate |
|---|-------|------|------|
| 1 | Specify | Convert requirements into Gherkin acceptance tests plus a QA procedure document | User approves the spec files |
| 2 | Code | Implement code and unit tests against the Gherkin specs; messiness allowed | All tests pass (`gauntlet check --spec`) |
| 3 | Clean | Refactor for complexity | CRAP scores within threshold (`gauntlet check --crap`) |
| 4 | Harden | Mutation-test until tests kill mutants | Mutation score at or above threshold (`gauntlet check --mutation`) |
| 5 | QA | Run system-level tests defined by the stage-1 QA procedure | QA suite passes (`gauntlet check --qa`) |

`gauntlet check` with no flags runs all deterministic gates (2–5) in order and stops at the first failure.

### Adaptive Execution

- If subagents are available, each stage dispatches to a fresh subagent with only that stage's playbook and inputs (Specifier, Coder, Cleaner, Hardener, QA).
- Otherwise, one agent walks the stages sequentially in a single session.
- Stage progress is tracked in a `gauntlet-state.md` artifact in the target project so interrupted runs resume from the last passed gate.

### Non-JS/TS Projects

The skill instructs the agent to discover ecosystem-standard equivalents (for example `mutmut`, `cargo-mutants`, `go-mutesting`) and run the same gate logic via configuration that points at those commands. Arc Forge ships no non-JS tooling itself.

## Package CLI: `packages/gauntlet`

Node CLI, published as an npm workspace package following the `one-thing-functions` pattern (bin entry, src/, tests/, profiles/).

### Commands

```sh
gauntlet check            # run all gates
gauntlet check --crap     # CRAP gate only
gauntlet check --mutation # mutation gate only
gauntlet check --spec     # unit/acceptance test gate only
gauntlet check --qa       # QA suite gate only
```

### Gates

- **Spec/test gate:** runs the project's test command; fails on any failing test.
- **CRAP gate:** computes cyclomatic complexity per function from the AST, combines it with code coverage (read from standard `c8`/Istanbul JSON summary output produced by the test run) to produce CRAP scores, fails if any function exceeds the threshold. Output lists worst offenders first with actionable messages ("function `foo` CRAP 14 > 8 — refactor or raise threshold").
- **Mutation gate:** wraps StrykerJS, parses the resulting mutation score, fails below threshold.
- **QA gate:** runs the QA command declared in config.

### Configuration

Defaults ship in a profile; projects override via `gauntlet.config.json` or CLI flags:

- `crapThreshold` (default 8)
- `mutationScoreThreshold` (default 85)
- `testCommand`, `qaCommand`
- `mutatorCommand` (escape hatch for non-Stryker ecosystems)

Profile layout mirrors `one-thing-functions/profiles`.

## Skill Layout

```txt
skills/engineering/gauntlet/
  SKILL.md
  references/
    stage-1-specify.md
    stage-2-code.md
    stage-3-clean.md
    stage-4-harden.md
    stage-5-qa.md
  templates/
    gauntlet-state.md
```

Each stage reference contains only what that role needs: inputs, procedure, gate command, loop-until-pass rule.

## Dogfooding Constraint

The implementation of `packages/gauntlet` must itself pass through the gauntlet:

1. Write Gherkin acceptance specs for the CLI before implementing commands.
2. Implement to make those specs pass (stage-2 style, mess allowed).
3. Refactor until the package passes its own CRAP gate (using `one-thing-functions` checks plus the new CRAP checker).
4. Add Stryker mutations and harden tests to hit the default mutation score.
5. Run the QA procedure end to end on the arc-forge repo itself.

The tool validates itself before it validates anyone else.

## Error Handling

- Every gate prints a failure reason and the exact remediation loop ("fix and re-run `gauntlet check --crap`").
- Missing prerequisites (no coverage data, no Stryker config) produce setup instructions, not stack traces.
- Exit codes: 0 pass, 1 gate failure, 2 configuration/setup error.

## Testing

- Package unit tests (vitest) for CRAP computation, score parsing, profile loading, CLI exit codes.
- Fixture projects under `packages/gauntlet/tests/fixtures/` covering: passing project, high-CRAP project, low-mutation-score project.
- Repo-level: update README skills/tools lists; `npm run check:skills` must pass; `npm test` must pass.
