---
name: forge-gate
description: "One entry point for forge-gate: detect how far a project is wired for deterministic quality gates and route accordingly — hand feature work to the gauntlet pipeline, adopt missing wiring, negotiate dependency rules, or enforce gates. Use when setting up or running forge-gate, when unsure which gate workflow applies, or when the CLI tells you to 'run the forge-gate skill'."
---

# Forge Gate

Deterministic gates over prompt steering. This skill detects the project's current state and routes to the right workflow — no upfront education required. It brings routing and process, never policy: thresholds, roots, and rules are decided with the user or negotiated through the forge-rules skill, never invented here.

## Detection checklist

Evaluate in order. First match wins. Check concrete facts, not impressions:

1. **The user's intent is building a new feature or story** → Hand off to the gauntlet pipeline skill. It inherits whatever wiring already exists. Do not adopt or enforce mid-feature; the gauntlet owns feature work end-to-end.
2. **Config is missing or an entire layer is incomplete.** Check each, stopping at the first gap:
   - Does `forge-gate.config.json` exist in the project root?
   - Does it define non-empty `roots` naming real directories?
   - Is `testCommand` set?
   - Does the coverage wiring actually produce Istanbul-format coverage (`coverage/coverage-final.json`) whose keys match scanned source paths? (Run the test command once and look.)
   - Any gap → **Adopt**, starting at the shallowest incomplete layer (see `references/adopt.md`). When adoption completes, resume this checklist from step 2.
3. **Config complete but no `dependencyRules` key.** Some imports are ungated. → Negotiate rules via the forge-rules skill (its Analyze → Propose → Grill → Finalize protocol), then continue below.
4. **Fully wired** (config complete, coverage verified, `dependencyRules` present) → **Enforce** (see `references/enforce.md`).

A bare `forge-gate check` that prints `dependency rules not configured — some imports are ungated` means you are somewhere between rows 2 and 3 of this checklist: find the row and follow it.

## Rules

1. Read only the reference playbook your route requires. Keep context small.
2. Every choice presented to the user follows the option-question protocol from the forge-rules skill's Grill stage: one question per message, 2–4 concrete grounded options each with a one-line trade-off, exactly one recommendation marked, free-text escape hatch always available. Read that protocol before asking anything.
3. Adoption is not done until every wired gate has been executed end-to-end at least once AND baselines are recorded. Red first runs are expected; they become baselines, not blockers.
4. Never make a gate green without either changing code or an explicit recorded user decision. Silent green is a defect, not a success.
5. Say plainly what is ungated. A passing exit code never implies coverage it does not have — especially for non-JS/TS code, which the deps gate cannot see at all.
