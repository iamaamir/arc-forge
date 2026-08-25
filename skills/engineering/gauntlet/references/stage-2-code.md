# Stage 2: Code

Input: approved `.feature` file(s).

Write the implementation and unit tests that make every scenario pass. Speed over beauty — this stage is allowed to produce messy code.

Configure the project once, if needed:

- `gauntlet.config.json` with `"testCommand"` (e.g. `"npm test"`).
- Coverage generation wired into the test command, e.g. `npx c8 --reporter=json-summary npm test`.

Gate: run `npx gauntlet check --spec` (or the local bin path). Loop until exit code 0. Update `gauntlet-state.md`.
