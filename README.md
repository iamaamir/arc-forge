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

- [`adaptive-ai-team-bootstrap`](skills/engineering/adaptive-ai-team-bootstrap/SKILL.md) — drop an adaptive AI product-engineering team into any project with induction, Memory.md, roles, specialist teams, governance, and verification loops.
- [`gauntlet`](skills/engineering/gauntlet/SKILL.md) — deterministic 5-stage agent pipeline: Gherkin specs → code → CRAP-clean → mutation-harden → QA, each stage ending in an exit-code gate.
- [`one-thing-function`](skills/engineering/one-thing-function/SKILL.md) — strict function-design rules for new or existing codebases.
- [`seeded-color-theme`](skills/design/seeded-color-theme/SKILL.md) — CSS-only palette generation from one seed color without tint-ladder slop.
- [`swarm-sofa`](skills/engineering/swarm-sofa/SKILL.md) — turn multi-agent exploration into tested reusable SOFA knowledge.

## Tools

- [`one-thing-functions`](packages/one-thing-functions) — checker CLI for one-thing function rules.
- [`forge-gate`](packages/forge-gate) — `forge-gate check` CLI gating projects on CRAP scores and mutation-test scores.

Validate an installed adaptive AI-team footprint:

```sh
node .agents/skills/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs --project .
```

After implementation work, require operating trace artifacts too:

```sh
node .agents/skills/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs --project . --require-runtime-trace
```

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
npm run publish
```

Other release types:

```sh
npm run publish -- minor
npm run publish -- major
```

The release script runs locally. It requires a clean working tree, runs tests, bumps `one-thing-functions`, commits the version change, creates a `v*` tag, pushes the current branch, and pushes the tag.

The GitHub workflow never bumps versions or writes to `main`. It only publishes the package version already committed on the pushed tag. This keeps it compatible with protected branches.

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
    design/
      seeded-color-theme/
        SKILL.md
    engineering/
      adaptive-ai-team-bootstrap/
        SKILL.md
        references/
        templates/
        scripts/
      one-thing-function/
        SKILL.md
      swarm-sofa/
        SKILL.md
      gauntlet/
        SKILL.md
        references/
        templates/
  packages/
    one-thing-functions/
      bin/
      src/
      profiles/
      examples/
      tests/
    forge-gate/
      bin/
      src/
      profiles/
      tests/
```
