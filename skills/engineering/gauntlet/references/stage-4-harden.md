# Stage 4: Harden

Input: clean, tested code.

Set up StrykerJS (`npx stryker init`, configure `"reports": ["json"]`, output to `reports/mutation/`). Run mutations, then for each surviving mutant ask: why did no test catch this changed behavior? Add an assertion that kills it — or decide explicitly that the mutant is equivalent and document it.

Default threshold is mutation score ≥ 85.

Gate: `npx forge-gate check --mutation`. Loop until exit code 0. Update `gauntlet-state.md`.

Non-JS ecosystems: use mutmut / cargo-mutants / go-mutesting and gate manually on their scores; record the command in `forge-gate.config.json`.
