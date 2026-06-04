# Arc Forge

Reusable agent skills and code-discipline tools.

## Skills

- [`one-thing-function`](skills/engineering/one-thing-function/SKILL.md) — strict function-design rules for new or existing codebases.

## Packages

- [`one-thing-functions`](packages/one-thing-functions) — checker CLI for one-thing function rules.

## Install skills

From local checkout:

```sh
npx skills add . --skill one-thing-function
```

After this repo is on GitHub:

```sh
npx skills add <owner>/arc-forge --skill one-thing-function
```

Install globally for one agent:

```sh
npx skills add <owner>/arc-forge --skill one-thing-function -g --agent pi
```

Install globally for all supported agents:

```sh
npx skills add <owner>/arc-forge --skill one-thing-function -g --agent '*'
```

List available skills:

```sh
npx skills add . --list
```

## Use checker locally

Install workspace dependencies:

```sh
npm install
```

Run checker from package source:

```sh
node packages/one-thing-functions/bin/one-thing-functions.mjs check src
```

Run tests:

```sh
npm test
```

Check skill discovery:

```sh
npm run check:skills
```

## Repository layout

```txt
arc-forge/
  skills/
    engineering/
      one-thing-function/
        SKILL.md
  packages/
    one-thing-functions/
      bin/
      src/
      profiles/
      examples/
      tests/
```
