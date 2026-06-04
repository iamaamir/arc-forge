# one-thing-functions

Strict function-design checker CLI.

Rules default to FP-first domain records:

- one function does one thing
- max one argument
- max 25 lines by default
- no currying tricks
- no array packs
- no object bags outside boundary/factory records

## CLI

```sh
npx one-thing-functions check src
npx one-thing-functions check src --profile=legacy-migration
npx one-thing-functions check src --config=one-thing-functions.config.mjs
```

## Config

```js
export default {
  profile: "fp-first",
  roots: ["src"],
  maxLines: 25,
  utilityAllowlist: ["clamp"],
};
```

Profiles:

- `fp-first` default
- `oo-friendly`
- `legacy-migration`

## Agent skill

The skill lives once at repo root:

```txt
../../skills/engineering/one-thing-function/SKILL.md
```

Install it with the open skills CLI:

```sh
npx skills add <owner>/arc-forge --skill one-thing-function
```
