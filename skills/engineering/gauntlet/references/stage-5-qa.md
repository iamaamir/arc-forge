# Stage 5: QA

Input: the QA procedure from stage 1.

Execute it end to end against the real system. Configure `"qaCommand"` in `forge-gate.config.json` where a command can express the procedure; otherwise execute interactively and record results in `gauntlet-state.md`.

Gate: `npx forge-gate check --qa`. Any failure returns you to the relevant earlier stage — a QA failure means a gate upstream was too weak. Update `gauntlet-state.md` and report completion to the user.
