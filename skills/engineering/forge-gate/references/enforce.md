# Enforce playbook

Route here when the detection checklist reaches row 4: config complete, coverage verified, `dependencyRules` present. Enforcement is a loop, and the loop has rules about what may make it stop.

## The loop

1. Run `npx forge-gate check`.
2. Classify every failure before acting:

| Result | Meaning | Action |
|---|---|---|
| Exit 1, new code violation | This change introduced it | **Loop-fix**: repair the code, re-run the same gate. Never proceed past red. |
| Exit 1, baseline debt | Recorded at adoption in decision notes | Leave alone. Debt is tracked, not re-litigated every run. |
| Exit 2 setup error | Config/pipeline broken (missing key, unparseable file) | **Repair-pipeline stop**: fix the setup before any other work. |
| Staleness warning (coverage older than sources) | Coverage is dead — scores are fiction | **Repair-pipeline stop**: re-run tests under c8 first. |

3. Repeat until exit 0 or every remaining failure is classified baseline debt.

## Hard rules

**Never write tests against dead coverage.** A staleness warning or exit-2 from the coverage pipeline means the measurement is broken; making measurements pass by writing tests against stale data enshrines fiction. Repair the pipeline first.

**No silent green.** Any resolution other than changing application code requires an explicit user decision via the option-question protocol (forge-rules Grill stage), recorded in decision notes:

- Raising or lowering a threshold
- Editing dependency rules to admit an import
- Accepting a new violation as debt

If the user did not answer a concrete question about it, it did not happen.

**Baseline vs new.** Compare failures against the baselines recorded at adoption. Only violations absent from the baseline record are loop-fixed. A baseline item that grows worse is a new violation at the delta — fix the delta.

## Deps violations

A fresh deps-gate failure names both endpoints (`file → imported-file (violates rule N)`). Fixing it is usually a code change (break the import). If the rule itself is wrong, renegotiate through the forge-rules skill — never weaken a rule inline just to get green.

## Reporting

End every enforce run with a status that includes accepted debt: what passed, what remains as recorded debt, and where the decision notes live. Green with invisible debt is not green.
