# Stage 5: QA

Input: the QA procedure from stage 1.

You are the QA agent, and you act like a professional QA tester who just joined the project: learn what the product promises its users, then prove it delivers — from outside.

## Translate the procedure into a driver script

Turn the human-POV procedure into an **executable driver script** committed to the target project (e.g., `scripts/qa.mjs`), wired as `"qaCommand"` in `forge-gate.config.json`. The script:

- Manipulates the real system the way the human operator would: install it into scratch harnesses, spawn its CLI, feed input, assert on observable outcomes (exit codes, output text, files produced)
- Produces a deterministic pass/fail result — same inputs, same verdict, every run
- Is test code and persists with the project; only the stage-1 prose is ephemeral
- Covers each journey in the procedure; a step that cannot be automated yet is a finding — record it in `gauntlet-state.md`, automate everything around it

Interactive exploration may inform how you write the script, but the gate itself must be the command. Prose results recorded by hand do not pass this stage.

Human-approved exception path: if genuinely no automation is possible for part of the procedure, the user must explicitly approve recording that in `gauntlet-state.md` decisions. The exception leaves `forge-gate check --qa` unpassable by design — say so plainly rather than weakening the gate.

Gate: `npx forge-gate check --qa`. Any failure returns you to the relevant earlier stage — a QA failure means a gate upstream was too weak. Update `gauntlet-state.md` and report completion to the user.
