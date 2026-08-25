# Stage 4: Finalize

Input: resolved decisions from Grill.

## Write the config

Write the agreed rules into `forge-gate.config.json` under `dependencyRules`, using the exact shape `forge-gate` validates:

- `rules`: array of `{ from, allow?, forbid? }` objects, first matching `from` wins, `forbid` beats `allow`.
- `allowNodeModules`: `true` or an array of globs.
- `unmatched`: `"deny"` or `"allow"`.
- `roots`: top-level config key naming the scanned directories. Always write it — rules without a population are decorative. If the config already exists, merge; do not clobber unrelated keys (`ignore`, CRAP thresholds, etc.).

If the project has no config file yet, create it containing at least `roots` and `dependencyRules`.

## Run the real gate

Run `npx forge-gate check --deps`. Then loop with the user on the outcome:

- **Green**: done. Skip to recording.
- **Red**: each violation is a negotiation item, back to the user via the Grill protocol (one question, options, recommendation):
  1. Fix the imports (code change) — re-run after fixing.
  2. Change the rule (the rule was wrong) — update, re-run.
  3. Accept the violation as documented debt — write the debt record **at acceptance time**, before continuing the loop (see below).

Never weaken a rule silently just to reach green.

## Record accepted debt

The moment the user accepts a violation, write it where the project tracks decisions (a config-adjacent notes file, or the project's state/decision doc) before asking the next question — do not batch debt recording for a wrap-up step that may never happen. Each entry states: the violating edge, why it is accepted, and what would make it unacceptable later. Accepted debt that is invisible is not accepted — it is forgotten.

Update any session state notes, then report the final gate result to the user.
