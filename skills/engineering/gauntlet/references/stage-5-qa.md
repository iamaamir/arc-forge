# Stage 5: QA

Input: the QA procedure from stage 1.

Your job is to turn that procedure into an **executable script** wired as `"qaCommand"` in `forge-gate.config.json`, producing a deterministic pass/fail result via the gate. Interactive exploration may inform how you write the script, but the gate itself must be a command — prose results recorded by hand do not pass this stage.

The script exercises the real system end to end: install it, run it, assert on observable outcomes (exit codes, output, files produced). A procedure step that cannot be automated yet is a finding, not a workaround — record it and automate what surrounds it.

Human-approved exception path: if genuinely no automation is possible, the user must explicitly approve recording that in `gauntlet-state.md` decisions. The exception leaves `forge-gate check --qa` unpassable by design — say so plainly in the state file rather than weakening the gate.

Gate: `npx forge-gate check --qa`. Any failure returns you to the relevant earlier stage — a QA failure means a gate upstream was too weak. Update `gauntlet-state.md` and report completion to the user.
