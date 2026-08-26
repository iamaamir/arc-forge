# Stage 2: Code

Input: approved `.feature` file(s).

Write the implementation and unit tests that make every scenario pass. Speed over beauty — this stage is allowed to produce messy code.

Prove the Gherkin actually runs: `--spec` only executes your `testCommand`, it cannot know your scenarios map to tests. For each feature file, record a scenario→test traceability line in `gauntlet-state.md` (e.g. `features/billing.feature → tests/billing.test.mjs: "rejected when card expired" → test "declines expired cards"`), and include evidence the mapped tests executed (test names in the runner output).

Configure the project once, if needed:

- `forge-gate.config.json` with `"testCommand"` (e.g. `"npm test"`).
- Coverage generation wired into the test command, e.g. `npx c8 --reporter=json npm test`.

Gate: run `npx forge-gate check --spec` (or the local bin path). Loop until exit code 0. Update `gauntlet-state.md`.
