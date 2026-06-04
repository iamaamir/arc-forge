# Arc Forge

Reusable agent skills and code-discipline tools.

## Install

Install all Arc Forge skills:

```sh
npx skills add iamaamir/arc-forge --all
```

Install from local checkout while developing:

```sh
npx skills add . --all
```

List available skills:

```sh
npx skills add iamaamir/arc-forge --list
```

## Skills

- [`one-thing-function`](skills/engineering/one-thing-function/SKILL.md) — strict function-design rules for new or existing codebases.

## Tools

- [`one-thing-functions`](packages/one-thing-functions) — checker CLI for one-thing function rules.

Run checker after package publish:

```sh
npx one-thing-functions check src
```

Run checker from local checkout:

```sh
node packages/one-thing-functions/bin/one-thing-functions.mjs check src
```

## Maintainer workflow

Publish everything in one go:

1. Bump package version.
2. Push a `v*` tag, create a GitHub release, or run the `Publish npm packages` workflow manually.

Example release:

```sh
npm version patch --workspace one-thing-functions
git add package-lock.json packages/one-thing-functions/package.json
git commit -m "chore(release): bump one-thing-functions"
git tag v0.1.1
git push && git push --tags
```

The workflow publishes all npm workspace packages to npmjs.com using npm Trusted Publishing (OIDC), so no npm token secret is needed. Skills are installed directly from this GitHub repository via `npx skills add`, so adding future skills under `skills/` needs no publish-infra change.

Trusted publishing setup on npmjs.com:

- Package: `one-thing-functions`
- Trusted publisher: GitHub Actions
- Repository: `iamaamir/arc-forge`
- Workflow filename: `publish-npm.yml`

## Development

Install dependencies:

```sh
npm install
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
