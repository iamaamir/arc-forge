---
name: one-thing-function
description: "Define or enforce strict function-design rules for new or existing codebases using functional domain records by default: single responsibility, one argument, short functions, and no loopholes. Use when starting a project with function rules, refactoring a codebase to those rules, adding rule checkers, or discussing one function one thing, one argument max, 25-line limits, object-bag exceptions, domain records, or no currying tricks."
---

# Strict Function Refactor

## Philosophy

The values matter more than the limits:
- cohesion over cleverness
- explicit dependencies over hidden state
- named concepts over tuples or positional packs
- readable code over rule compliance

The checker enforces shape. Humans decide design. Treat violations as prompts to inspect code, not automatic proof code is bad. Do not make code worse to satisfy this skill.

## Core rules

1. One function does one thing.
2. Function takes max one argument.
3. Function body should not exceed configured limit, default 25 lines.
4. Prefer functional domain records over classes.
5. Do not satisfy rules with tricks.

## Default style: functional domain records

Use plain objects as named domain records, not ad-hoc parameter bags.

Good:
```js
function makeRequestEvent(input) {
  return {
    message: input.message,
    sender: input.sender,
    reply: input.reply,
  };
}

function dispatchRequest(event) {
  const handler = handlers.get(event.message.type);
  handler(event);
}
```

Bad:
```js
function dispatchRequest({ message, sender, reply }) {}
```

Difference:
- Factory/boundary builds named record from raw input.
- Internal functions receive named record/value.
- Object is real project concept, not syntax camouflage.

## Argument policy

Allowed:
- Zero args.
- One real value arg: primitive, entity, command, event, collection, service, or domain record.
- One explicit object only at boundary/factory when constructing a domain record.

Forbidden:
- Multiple args in normal functions.
- Object bags in normal functions.
- Destructured multi-field params in normal functions.
- Array positional packs.
- Currying to smuggle multi-input operations.
- Renaming params to hide responsibility.
- Extracting tiny helpers only to hide line count without naming a real idea.

## Classes policy

Default: avoid classes.

Use classes only when project already uses OO style or behavior truly needs identity/lifecycle/stateful methods.

Constructor exception if classes are used:
- Constructors may be explicit because initialization often binds state.
- If constructor needs 0–2 values, positional args are allowed.
- If constructor needs more than 2 values, use one explicit object argument.
- Constructor object must use named fields and remain readable.

## Friction zones and exceptions

Some JavaScript patterns naturally conflict with hard limits. Do not fight the language or framework when readability would suffer.

Reasonable exceptions:
- Framework/platform callbacks with fixed signatures.
- Array callbacks where index is meaningful, e.g. `.map((item, index) => ...)`.
- Event/HTML boundaries where signature is imposed externally.
- IIFE/module wrappers used for scoping or build boundaries.
- Tiny pure utilities where a domain record would reduce clarity.
- Slightly-over-limit functions that are cohesive and easier to read whole.

Examples that may deserve explicit allowlist:
```js
clamp(value, min, max)
replace(text, search, replacement)
range(start, end)
```

Keep exceptions intentional, documented, and checker-allowlisted when used in CI.

## Checker CLI

Use `one-thing-functions` whenever possible instead of hand-written regex audits. By default, treat checker output as an audit list. Only wire it as a hard CI gate after agreeing on project-specific exceptions.

Quick audit:
```sh
npx one-thing-functions check src
```

Multiple roots:
```sh
npx one-thing-functions check src scripts tests
```

With profile:
```sh
npx one-thing-functions check src --profile=legacy-migration
```

With config:
```sh
npx one-thing-functions check src --config=one-thing-functions.config.mjs
```

Example config:
```js
export default {
  profile: "fp-first",
  roots: ["src", "scripts"],
  maxLines: 25,
  utilityAllowlist: ["clamp", "range"],
};
```

Project setup for new or existing codebases:
```sh
npx one-thing-functions init
npm install -D one-thing-functions
npm run lint:functions
```

For custom roots:
```sh
npx one-thing-functions init --roots=src,scripts
```

`init` is safe to use in both new and old projects. It detects common roots (`src`, `lib`, `app`, `scripts`, `packages`, etc.), falls back to `.`, creates `one-thing-functions.config.mjs` if missing, and adds/updates `scripts.lint:functions` in `package.json` when present.

If `npx one-thing-functions` is unavailable, still follow rules manually and add checker later.

## When starting a new codebase

1. Write rules into project instructions first.
2. Run `npx one-thing-functions init` before feature code grows.
3. Choose line limit and exception policy in `one-thing-functions.config.mjs`.
4. Model inputs as domain records at boundaries.
5. Add `lint:functions` to project checks.
6. Review new public APIs against rules during design.

## When refactoring existing code

1. Run `npx one-thing-functions init --roots=<roots>` to install checker config and script.
2. Run `npm run lint:functions` to get baseline violations.
3. Audit violations before editing.
4. Refactor one slice at a time.
5. Preserve behavior; run tests after each slice.
6. Replace multi-arg clusters with named domain records only when concept is real.
7. Update checker config as rules become clearer.
8. Before completion, run full checks.

## Checker guidance

A checker should flag:
- More than one parameter for non-constructor functions.
- Destructured normal function parameters with multiple fields.
- Functions over configured line limit.
- Curried function patterns used as multi-input operations when detectable.

A checker may allow:
- Factory functions named `make*`, `create*`, `from*` with one explicit object arg.
- Constructor with one object parameter.
- Constructor with at most two positional parameters.
- Documented tiny utility allowlist.

## Judgement test

Ask before accepting any refactor:
- Does name describe one idea?
- Would code still be readable without knowing rule exists?
- Did we create real domain language or syntax camouflage?
- Is exception more readable than compliance?
- Is object created at boundary and passed as named record internally?
- Did tests prove behavior stayed same?
