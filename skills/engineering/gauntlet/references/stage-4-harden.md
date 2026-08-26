# Stage 4: Harden

Input: clean, tested code.

Set up StrykerJS (`npx stryker init`, configure `"reports": ["json"]`, output to `reports/mutation/`). Run mutations, then for each surviving mutant ask: why did no test catch this changed behavior? Add an assertion that kills it — or decide explicitly that the mutant is equivalent and document it. If a survivor turns out to be dead code, delete the code instead of documenting it.

Default threshold is mutation score ≥ 95.

Why 95 and not 100: the source workflow's hardener is absolutely merciless — effectively total coverage, every `=`, every `<` mutated. The default sits at 95 because provably equivalent mutants genuinely exist once a suite is this strong (our own dogfood run documented 87 equivalents at a raw score of 92.32%). Below 95, survivors mean your tests are too weak — kill more. Above 95, the loop becomes kill-or-prove-equivalent for every remaining survivor, which the ratchet in the forge-gate README extends further. Raising thresholds still requires explicit user approval; lowering one to get green is never acceptable.

Gate: `npx forge-gate check --mutation`. Loop until exit code 0. Update `gauntlet-state.md` with the score and the documented equivalents.

Non-JS ecosystems: use mutmut / cargo-mutants / go-mutesting and gate manually on their scores; record the command in `forge-gate.config.json`.
