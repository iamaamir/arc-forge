# forge-gate

Deterministic quality gates for AI coding agents. Agents treat long instructions as guidelines; they cannot ignore an exit code. `forge-gate check` runs gates that either pass or fail loudly, so agents loop until the code actually passes.

Gates:

| Gate | Flag | What it checks | Default threshold |
|------|------|----------------|-------------------|
| Spec | `--spec` | Your project's tests pass (`testCommand`) | — |
| CRAP | `--crap` | No function exceeds a Change Risk Anti-Patterns score from cyclomatic complexity × line coverage | CRAP ≤ 8 |
| Mutation | `--mutation` | StrykerJS mutation score computed from mutant statuses | ≥ 95 |
| QA | `--qa` | Your system-level suite passes (`qaCommand`) | — |
| Deps | `--deps` | The import graph respects negotiated `dependencyRules` (see [Dependency rules](#dependency-rules---deps)) | opt-in |

Exit codes: `0` pass, `1` gate failure, `2` setup/configuration problem. Explicit help requests (`forge-gate --help`, `-h`, or `help`) exit 0; unknown arguments print help and exit 2.

```sh
npx forge-gate check            # run all four gates
npx forge-gate check --crap     # run one gate
npx forge-gate check --crap=12  # override a threshold for one run
```

---

## 1. Existing JavaScript project

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

**Why 95, and why not 100:** the source workflow demands a merciless hardener — mutation testing with effectively total coverage, every surviving mutant killed or proven equivalent. The default threshold is 95 rather than 100 because provably equivalent mutants genuinely exist (our own dogfood run documented 87 of them at a 92.32% raw score before hardening). Up to ~95 the loop is "kill more mutants"; beyond it, every remaining survivor must be individually argued equivalent or removed as dead code — which is exactly the discipline the ratchet below enforces.

**Mutation ratchet:** a legacy or untested codebase may not hit score ≥ 95 immediately. Start with a lowered threshold (e.g. `"mutationScoreThreshold": 50`–`70`) and ratchet upward toward 95 — and ideally beyond, toward kill-or-prove-equivalent on every survivor. Every surviving mutant should be either killed by a test, deleted as dead code, or explicitly documented as an equivalent mutant; never just lower the threshold to make it go away.

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
  "mutationScoreThreshold": 95,
  "testCommand": "npm test",
  "qaCommand": ""
}
```

Progress is tracked in `gauntlet-state.md` in your repo, so interrupted runs resume from the last passed gate.

## 3. Non-JS/TS projects

The CLI's static analysis parses JavaScript and TypeScript. For Python, Rust, Go, etc., keep the same stage structure but substitute ecosystem tools and gate manually — the discipline transfers, the binary doesn't.

Substitutions that work well:

| Gate | Python | Rust | Go |
|------|--------|------|-----|
| Complexity/coverage | `radon` cc + `coverage.py` | `cargo-tarpaulin` | `gocyclo` + `go test -cover` |
| Mutation | `mutmut` | `cargo-mutants` | `go-mutesting` |
| Tests/QA | `pytest` | `cargo test` | `go test ./...` |

Workflow per stage:

1. Run the substituted analyzer/mutator after each coding batch.
2. Apply the same thresholds as defaults: complexity-derived CRAP ≤ 8, mutation score ≥ 95.
3. Record every command you ran and its result in `gauntlet-state.md` — that artifact is your audit trail since the CLI can't compute these gates for you.

Never skip a gate because tooling is inconvenient — pick an equivalent tool instead.

## Configuration reference

`forge-gate.config.json` (all keys optional):

```json
{
  "roots": ["src"],
  "extensions": [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"],
  "ignore": ["node_modules", ".git", "dist", "coverage", "reports"],
  "crapThreshold": 8,
  "coverageFinalPath": "coverage/coverage-final.json",
  "mutationReportPath": "reports/mutation/mutation.json",
  "mutationScoreThreshold": 95,
  "testCommand": "",
  "qaCommand": "",
  "commandTimeoutSeconds": 300
}
```

CLI flags override config values for a single run: `--crap=N`, `--mutation=N`, `--roots=src,lib`. A value form selects its gate too — `check --crap=12` runs *only* the CRAP gate with threshold 12, no all-gates fallback. If the same option appears more than once, the last occurrence wins and earlier ones are ignored entirely (`--crap=5 --crap=40` runs with 40).

Note the asymmetry on empty roots: `--roots=` (CLI, empty value) is treated as unset and falls back to defaults, while `"roots": []` in config is a setup error (exit 2). A config that says "no directories" is almost certainly a mistake; an empty flag usually means "not set".

Parsing is pluggable per extension. Default extensions: `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`. Listing `.jsx`/`.tsx` in `extensions` alone does nothing — the guard only fires when the scanner actually encounters a `.jsx`/`.tsx` file, which yields a clean setup error naming the limitation. JSX support is deferred, not broken.

### TypeScript

`.ts`/`.mts`/`.cts` files are parsed with [amaro](https://github.com/nodejs/amaro) (the SWC-based transformer Node itself ships for type stripping) in transform mode, then analyzed by the same acorn pipeline as JavaScript. Complexity semantics are identical.

Two hard rules:

- **Line fidelity:** CRAP reports cite `file:line` of your original TypeScript. Amaro transform mode reflows code (type-only lines vanish; enum/namespace lowering expands), so forge-gate verifies positions using amaro strip mode as a position oracle and reports original lines. Files containing non-erasable syntax whose lowering shifts line numbers (enums, namespaces) cannot be scored faithfully and fail with a clean setup error naming the construct.
- **Unsupported syntax:** parameter properties (`constructor(private service)`) and decorators produce a clean setup error naming the syntax and file.

**Coverage pipeline requirement:** for the CRAP gate to join coverage against TypeScript sources, run your tests under `node --experimental-strip-types` with c8:

```sh
c8 --reporter=json node --experimental-strip-types --test tests/*.test.ts
```

This produces `coverage-final.json` keyed by the original `.ts` paths. If you compile TypeScript before testing instead, the emitted `.js` files are what gets scored — pick one pipeline and stick to it. If `.ts` paths are missing from coverage data, functions read as 0% covered and the staleness warning will point at the cause.

amaro is a WebAssembly build: it installs and runs on Node ≥ 20 even though its own `engines` field says `>=22`.

**`SwitchCase` complexity semantics:** cyclomatic complexity counts each `case` clause *and* each `default` clause as +1, on top of the function's base complexity of 1. A three-way switch with a default therefore scores 5. This is consistent with how the CRAP gate is tuned against this tool.

**Coverage semantics:** per-function coverage is computed from Istanbul statement maps:

- Statements inside nested functions count toward the *enclosing* function's span coverage. This is conservative (fail-closed): an untested nested callback drags down the outer function's score instead of hiding behind it.
- Functions whose line span intersects zero instrumented statements are treated as 100% covered. No statements means nothing to have covered.
- An entirely empty `coverage-final.json` (`{}`) is a setup error (exit 2), not a silent 100%-coverage pass — it almost always means your tests ran without instrumentation. Regenerate with `npx c8 --reporter=json <your test command>`.

### Dependency rules (`--deps`)

Bare `forge-gate check` runs all *configured* gates; the deps gate is optional — without a `dependencyRules` block it is skipped with a stderr notice (`dependency rules not configured — some imports are ungated`), so projects that never negotiate rules are unaffected. Pass `--deps` explicitly to enforce them; that exits 2 when `dependencyRules` is missing. Negotiate the rules with your team — or with the [`forge-rules`](../../skills/engineering/forge-rules/SKILL.md) skill — never invent them silently.

```json
{
  "roots": ["src"],
  "dependencyRules": {
    "rules": [
      { "from": "src/core/**", "allow": [] },
      { "from": "src/cli/**", "allow": ["src/core/**"], "forbid": ["src/core/private/**"] }
    ],
    "allowNodeModules": true,
    "unmatched": "allow"
  }
}
```

Semantics:

| Construct | Semantics |
|-----------|-----------|
| Rule matching | first rule whose `from` glob matches the importing file wins; later rules are never consulted for that file |
| `forbid` beats everything | a target matching the matched rule's `forbid` is a violation, even if also allowed |
| Implicit self-allow | targets inside the matched rule's own `from` subtree are always allowed — siblings in a layer import each other freely |
| Explicit `allow` | globs of targets the matched file may import |
| No match at all | target is neither forbidden, self, nor allowed → violation ("neither allowed nor forbidden by rule N") |
| `allowNodeModules` | `true` allows all external packages; an array of globs allows only matching bare specifiers / `@scope/name` paths; `false` denies every external import |
| Workspace packages | a `node_modules` entry is governed by rules only if its realpath resolves back into repo source (npm-workspaces-style symlink); plain installs under `node_modules` are external |
| `unmatched` | files matching no `from` pattern: `"deny"` (the default) flags them as violations, `"allow"` skips them |
| `roots` | top-level config key naming what gets scanned — rules without a scanned population are decorative |

Violations exit 1 and name both endpoints (`src/cli/main.ts -> src/core/engine.ts (violates rule 2)`), where `rule N` is the 1-based index into `rules`. A red deps gate after finalization means renegotiate: fix imports, change rules, or accept and record the violation as debt — never weaken a rule silently to get green.

## Philosophy

Spec-driven development fails because agents follow plans literally without wisdom. Massive prompt documents fail because LLMs treat them as guidelines ("lost in the middle"). What survives both problems is deterministic: write small acceptance specs up front (agile, not waterfall), then let tools that cannot be argued with decide when code is done.

Fundamentals still matter. If agents generate messes nobody can read and no one understands data structures or architecture anymore, you eventually hit a wall the AI cannot handle either. The gauntlet is how you get speed without the wall.

On spec lifetimes: `.feature` files persist deliberately — they are executable acceptance criteria, kept green by `--spec` on every run. Prose QA documents are ephemeral by contrast: they exist to be converted into an executable `qaCommand`, after which the script, not the prose, is the lasting artifact.

**Deferred, not forgotten — junior-dev training mode:** the gauntlet's origin story includes new human developers working under the same deterministic gates *without* an AI crutch, months at a time, to learn why structure matters before orchestrating agents. Tooling for that mode (guided onboarding thresholds, per-trainee ratchet tracking) is deliberately deferred; nothing in the current design blocks it.
