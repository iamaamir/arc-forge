# Stage 3: Clean

Input: green code from stage 2.

Reduce complexity while keeping every test green:

1. Run `npx forge-gate check --crap`.
2. For each reported function: extract helpers, replace conditionals with lookup tables or polymorphism, split oversized functions.
3. Re-run the gate after each batch. Behavior must never change — tests are the referee.

Default threshold is CRAP ≤ 8. Raising it requires explicit user approval.

When the CRAP loop passes, your job is not done. Second mandatory duty: **general code review of the full stage-2 diff**, hunting mess the gate cannot measure — dead code, misleading names, swallowed errors, duplicated logic, leftover debris. Execute the Axiom review playbook (`references/axiom-review.md`) against the stage-2 diff; its findings table and verdict (SHIP IT / FIX FIRST) go in `gauntlet-state.md`. Fix what you find; tests remain the referee. The gate scores complexity × coverage, not clarity — this review is how the dogfood run caught `build-static.mjs` calling an unimported `rm()` that every rebuild would have crashed on.

Gate: `npx forge-gate check --crap`. Loop until exit code 0, then complete the diff review. Update `gauntlet-state.md`.
