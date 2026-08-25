# Stage 3: Clean

Input: green code from stage 2.

Reduce complexity while keeping every test green:

1. Run `npx gauntlet check --crap`.
2. For each reported function: extract helpers, replace conditionals with lookup tables or polymorphism, split oversized functions.
3. Re-run the gate after each batch. Behavior must never change — tests are the referee.

Default threshold is CRAP ≤ 8. Raising it requires explicit user approval.

Gate: `npx gauntlet check --crap`. Loop until exit code 0. Update `gauntlet-state.md`.
