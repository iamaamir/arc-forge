# Adoption playbook

Route here when the detection checklist finds a missing or incomplete layer. Work through layers shallowest-first; after each completed layer, re-check whether it is actually exercised before moving on. The agent does all wiring — the user answers questions and never reads docs.

## Principles

- **The agent wires; the user decides.** Every setup choice (Stryker or not, which roots, threshold starting points) is an option question using the forge-rules Grill protocol. Never ask an open-ended question that could have been options.
- **Nothing counts as configured until it has been run.** A key in a config file is intent; an executed command with a recorded result is adoption.
- **Legacy repos start red.** CRAP ≤ 8 and mutation ≥ 95 do not hold on day one. Baselines are how adoption completes on a red repo.

## Layer 1: Install forge-gate + coverage pipeline

Goal: `testCommand` runs tests under c8 and produces Istanbul-format coverage at `coverage/coverage-final.json` keyed by real source paths.

1. Install: `npm install -D forge-gate c8` (or run via `npx`).
2. Wire the test script so c8 emits JSON coverage, e.g.:
   ```json
   "scripts": { "test": "c8 --reporter=json --reporter=text node --test tests/*.test.mjs" }
   ```
   Any test runner works as long as c8 (or another Istanbul-compatible tool) writes `coverage/coverage-final.json`.
3. TypeScript projects: run tests under `node --experimental-strip-types` inside c8 so coverage keys carry the original `.ts` paths. Compiling first scores the emitted `.js`, not your sources.
4. **Verify**: execute the test script once, then confirm `coverage/coverage-final.json` exists and spot-check that its keys are repo-relative paths of scanned sources. Missing `.ts` keys mean functions will read 0% covered — fix the pipeline now, not later.

## Layer 2: Scaffold config

Create `forge-gate.config.json` (merge into any existing file; never clobber unrelated keys):

- `roots`: heuristic inventory owned by this playbook — list actual source directories found in the repo (`src/`, `lib/`, workspace globs like `packages/*/src`). Propose what the inventory shows; confirm via one option question when more than one plausible population exists.
- `extensions`: defaults `.js .mjs .cjs .ts .mts .cts`; trim only what the project cannot parse.
- `testCommand`: the script verified in Layer 1.

## Layer 3: Mutation testing — option question

Ask once: adopt Stryker now, or defer?

1. Adopt Stryker — Recommended for repos with meaningful logic; costs install + slower CI
2. Defer — gate stays unwired; record that mutation is ungated in decision notes

If adopted: `npm install -D @stryker-mutator/core`, `npx stryker init`, configure per the forge-gate package README (command runner, JSON reporter writing `reports/mutation/mutation.json`), then run `npx stryker run` once to prove the report path is produced.

## Layer 4: Exercise every wired gate end-to-end

Run each wired gate individually and record the result:

```sh
npx forge-gate check --spec      # if testCommand set
npx forge-gate check --crap      # requires Layer 1 coverage
npx forge-gate check --mutation  # if Layer 3 adopted
npx forge-gate check --qa        # if qaCommand set
```

First runs on legacy code WILL fail. That is the system working.

## Layer 5: Record baselines

For every red result, resolve it with an option question — never by silently editing thresholds yourself:

1. Raise the starting threshold to clear today's debt (e.g. `"crapThreshold": 30`, `"mutationScoreThreshold": 60`) with a ratchet plan toward the defaults — Recommended; makes the gate enforceable immediately
2. Keep strict thresholds and record the violations as accepted debt in decision notes — honest but red on every run until paid down
3. Fix the flagged functions right now — best code outcome; practical only for short violation lists

Record in decision notes: every executed gate command and its result, chosen starting thresholds or accepted-violations lists, and the ratchet plan (target: CRAP ≤ 8, mutation ≥ 95). Adoption completes only when every wired gate has ≥1 executed run recorded AND baselines exist.

## Non-JS/TS projects

State plainly what is ungated — do not let a green exit imply coverage:

- The deps gate parses JS/TS ASTs only; non-JS imports are invisible to it.
- Command gates (`--spec`, `--qa`) can wrap any ecosystem tool.
- CRAP/mutation have no native support: substitute ecosystem tools per the package README §3 (radon+coverage.py, mutmut, cargo-mutants, …), run them directly, and track commands and results in decision notes.

Say in decision notes exactly which gates are substituted and which are absent. Then resume the detection checklist.
