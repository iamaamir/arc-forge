# forge-gate

Deterministic quality gates for AI coding agents. Agents treat long instructions as guidelines; they cannot ignore an exit code. `forge-gate check` runs gates that either pass or fail loudly, so agents loop until the code actually passes.

Gates:

| Gate | Flag | What it checks | Default threshold |
|------|------|----------------|-------------------|
| Spec | `--spec` | Your project's tests pass (`testCommand`) | — |
| CRAP | `--crap` | No function exceeds a Change Risk Anti-Patterns score from cyclomatic complexity × line coverage | CRAP ≤ 8 |
| Mutation | `--mutation` | StrykerJS mutation score computed from mutant statuses | ≥ 85 |
| QA | `--qa` | Your system-level suite passes (`qaCommand`) | — |

Exit codes: `0` pass, `1` gate failure, `2` setup/configuration problem.

```sh
npx forge-gate check            # run all four gates
npx forge-gate check --crap     # run one gate
npx forge-gate check --crap=12  # override a threshold for one run
```

---

## 1. Existing JS/TS project

**Step 1 — make sure tests + coverage run.** The CRAP gate reads Istanbul-format coverage (`coverage/coverage-final.json`) and computes coverage per function, not per file. Wire c8 into your test script if you don't have it:

```sh
npm install -D c8
```

```json
"scripts": {
  "test": "c8 --reporter=json --reporter=text node --test tests/*.test.mjs"
}
```

Any runner works (`jest`, `vitest`, …) as long as c8 (or another Istanbul-compatible tool) produces `coverage/coverage-final.json`.

**Step 2 — declare your commands.** Create `forge-gate.config.json` in the project root:

```json
{
  "testCommand": "npm test",
  "qaCommand": "npm run e2e"
}
```

Only set what you use: `--spec` needs `testCommand`, `--qa` needs `qaCommand`.

**Step 3 — run the gates one at a time first**, fixing as you go, then together:

```sh
npx forge-gate check --crap       # refactor flagged functions until exit 0
npx forge-gate check --mutation   # see step 4
npx forge-gate check              # everything
```

Expected output on failure is actionable by design:

```txt
CRAP gate failed:
  src/billing.js:42 function `prorate` CRAP 20 > 8 — refactor or raise the threshold
```

**Step 4 — mutation testing.** Install Stryker and emit the JSON report where the gate expects it:

```sh
npm install -D @stryker-mutator/core
npx stryker init
```

In `stryker.config.json`:

```json
{
  "testRunner": "command",
  "commandRunner": { "command": "npm test" },
  "reporters": ["json"],
  "coverageAnalysis": "off"
}
```

Run `npx stryker run`, which writes `reports/mutation/mutation.json`. Then loop: for each surviving mutant, ask *why did no test catch this behavior change?* and add an assertion that kills it — until `forge-gate check --mutation` exits 0.

**Adopting incrementally:** legacy code will not pass CRAP ≤ 8 on day one. Start with a raised threshold (`"crapThreshold": 30`) and ratchet it down over time. Raising thresholds should be a deliberate decision, not a reflex.

## 2. Starting a project from scratch

Don't just add the checker later — use the full pipeline from commit one. Install the companion skill and let it drive:

```sh
npx skills add iamaamir/arc-forge --all
```

Then tell your agent **run the gauntlet** and describe the feature. The pipeline:

1. **Specify** — agent writes Gherkin acceptance tests (`features/*.feature`) plus a QA procedure before any implementation code exists. You approve them.
2. **Code** — agent implements against the specs; messiness allowed.
3. **Clean** — agent refactors until `forge-gate check --crap` exits 0.
4. **Harden** — agent kills surviving mutants until `forge-gate check --mutation` exits 0.
5. **QA** — system-level verification via the stage-1 procedure.

Scaffold the config early so gates are runnable from the first commit:

```json
{
  "crapThreshold": 8,
  "mutationScoreThreshold": 85,
  "testCommand": "npm test",
  "qaCommand": ""
}
```

Progress is tracked in `gauntlet-state.md` in your repo, so interrupted runs resume from the last passed gate.

## 3. Non-JS/TS projects

The CLI's static analysis (acorn AST → complexity) only parses JavaScript. For Python, Rust, Go, etc., keep the same stage structure but substitute ecosystem tools and gate manually — the discipline transfers, the binary doesn't.

Substitutions that work well:

| Gate | Python | Rust | Go |
|------|--------|------|-----|
| Complexity/coverage | `radon` cc + `coverage.py` | `cargo-tarpaulin` | `gocyclo` + `go test -cover` |
| Mutation | `mutmut` | `cargo-mutants` | `go-mutesting` |
| Tests/QA | `pytest` | `cargo test` | `go test ./...` |

Workflow per stage:

1. Run the substituted analyzer/mutator after each coding batch.
2. Apply the same thresholds as defaults: complexity-derived CRAP ≤ 8, mutation score ≥ 85.
3. Record every command you ran and its result in `gauntlet-state.md` — that artifact is your audit trail since the CLI can't compute these gates for you.

Never skip a gate because tooling is inconvenient — pick an equivalent tool instead.

## Configuration reference

`forge-gate.config.json` (all keys optional):

```json
{
  "roots": ["src"],
  "extensions": [".js", ".mjs", ".cjs", ".jsx"],
  "ignore": ["node_modules", ".git", "dist", "coverage", "reports"],
  "crapThreshold": 8,
  "coverageFinalPath": "coverage/coverage-final.json",
  "mutationReportPath": "reports/mutation/mutation.json",
  "mutationScoreThreshold": 85,
  "testCommand": "",
  "qaCommand": ""
}
```

CLI flags override config values for a single run: `--crap=N`, `--mutation=N`, `--roots=src,lib`.

## Philosophy

Spec-driven development fails because agents follow plans literally without wisdom. Massive prompt documents fail because LLMs treat them as guidelines ("lost in the middle"). What survives both problems is deterministic: write small acceptance specs up front (agile, not waterfall), then let tools that cannot be argued with decide when code is done.

Fundamentals still matter. If agents generate messes nobody can read and no one understands data structures or architecture anymore, you eventually hit a wall the AI cannot handle either. The gauntlet is how you get speed without the wall.
