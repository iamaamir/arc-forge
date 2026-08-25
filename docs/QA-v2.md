# Forge Gate v2 QA Procedure

Run from the repository root after all unit gates pass:

1. `npm install` — workspaces (including the new amaro dependency) resolve.
2. `npm test` — all suites green, including TS parser fidelity and deps-gate fixture tests.
3. `npx skills add . --list` — both `gauntlet` and `forge-rules` appear.
4. From `packages/forge-gate`: `node bin/forge-gate.mjs check --deps --crap --mutation`
   — all three gates exit 0 against arc-forge's own root config.
5. Scratch-project drill (TS): create a temp project with a covered trivial `.ts` function
   and an uncovered complex one; run c8 + `--experimental-strip-types`; confirm
   `forge-gate check --crap` flags only the complex one, citing original line numbers.
   Files containing enums/namespaces are a separate check: they cannot be scored faithfully
   (lowering shifts lines; strip-only Node cannot even run them), so confirm `check --crap`
   rejects them with the documented clean setup error naming the construct.
6. Scratch-project drill (deps): reproduce the negative fixture; confirm exit 1 names
   both endpoints of the violating import.
7. Grilling drill: run `/forge-rules` on a scratch repo; confirm option-based questions,
   one per message, recommendation marked, config written, gate re-run looped to green.
8. Confirm every stage playbook's gate command matches the CLI flags exactly.
9. Confirm README documents: TS extensions, coverage pipeline requirement, deps semantics
   table, junior-dev training mode deferral.
