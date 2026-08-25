---
name: forge-rules
description: "Negotiate dependency rules for a codebase by analyzing it and grilling the user, then write dependencyRules into forge-gate.config.json for enforcement via `forge-gate check --deps`. Use when setting up architecture guardrails, or when the deps gate reports violations that need rule changes rather than code changes."
---

# Forge Rules

Dependency rules are negotiated with the user, never invented. This skill brings process, not policy: it contains no layer names, no default rules, and no architectural opinions. Every rule that ends up in the config comes from analysis of this specific codebase plus an explicit user decision.

## Stages

| # | Stage | Output | Exit |
|---|-------|--------|------|
| 1 | Analyze | inventory of directories, entry points, fan-in/fan-out, boundary hints | findings presented |
| 2 | Propose | 3–7 candidate rules grounded in the findings | user has candidates in view |
| 3 | Grill | every rule and undecided boundary explicitly decided | decision tree fully resolved |
| 4 | Finalize | rules written to `forge-gate.config.json`, gate run | `forge-gate check --deps` green, or debt consciously accepted |

Read the reference playbook for the current stage before acting. Only that playbook — keep context small. For visualizing the analyzed imports, read `references/visualization.md`; rendering is the host environment's choice.

## Execution model

Run stages sequentially. Do not enter a stage before the previous one's output exists. The Grill stage may revisit Propose when an answer invalidates a candidate rule — that is expected, not a failure.

## Rules

1. Never write a rule the user did not agree to. Agreement means an answer to a concrete question, not silence.
2. Never propose generic advice ("keep core independent"). Every candidate must cite what the analysis actually found.
3. A red `forge-gate check --deps` after finalization returns the session to negotiation: fix imports, change rules, or accept and record the violation as debt. Never silently weaken a rule to get green.
4. Accepted violations must land in decision notes where the project tracks decisions — invisible debt is not accepted debt.
5. Always negotiate and write `roots` alongside rules. Rules without a matching scanned population are decorative.
