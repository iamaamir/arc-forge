---
name: one-thing-function
description: "Define or enforce strict function-design rules for new or existing codebases using functional domain records by default: single responsibility, one argument, short functions, and no loopholes. Use when starting a project with function rules, refactoring a codebase to those rules, adding rule checkers, or discussing one function one thing, one argument max, 25-line limits, object-bag exceptions, domain records, or no currying tricks."
---

# Strict Function Refactor

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

## Tiny utility exceptions

Tiny pure utilities may be exempt only when a domain record would reduce readability.

Examples that may deserve explicit allowlist:
```js
clamp(value, min, max)
replace(text, search, replacement)
range(start, end)
```

Keep exceptions rare, documented, and checker-allowlisted.

## When starting a new codebase

1. Write rules into project instructions first.
2. Add checker before feature code grows.
3. Choose line limit and exception policy.
4. Model inputs as domain records at boundaries.
5. Review new public APIs against rules during design.

## When refactoring existing code

1. Audit violations before editing.
2. Refactor one slice at a time.
3. Preserve behavior; run tests after each slice.
4. Replace multi-arg clusters with named domain records only when concept is real.
5. Update checker as rules become clearer.
6. Before completion, run full checks.

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
- Is object created at boundary and passed as named record internally?
- Did tests prove behavior stayed same?
