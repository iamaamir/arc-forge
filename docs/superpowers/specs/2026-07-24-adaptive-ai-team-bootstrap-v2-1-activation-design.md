# Adaptive AI Team Bootstrap V2.1 Activation Design

Date: 2026-07-24

## Summary

Harden `adaptive-ai-team-bootstrap` so a minimal slash-style prompt activates the AI-team bootstrap workflow instead of generic app planning or scaffolding.

Regression prompt:

```text
/adaptive-ai-team-bootstrap

I want to build a very basic Trello-like app.
```

The agent must treat the Trello app as project context for induction, not as permission to start app planning or code.

## Goals

- Make bare skill invocation sufficient.
- Separate project intent from implementation permission.
- Prescribe the first response shape.
- Prevent routing to generic PRD/planning/TDD/scaffolding before the AI-team footprint decision.
- Ask a root-selection question when the current directory is empty, skill-install-only, or has nested app candidates.
- Ignore installed skill/cache directories during induction sampling.
- Make the checker reject unrelated `AGENTS.md` files that lack the adaptive AI-team marker.

## Non-Goals

- Do not build the Trello app.
- Do not add broad validator hardening beyond `AGENTS.md` marker validation.
- Do not change the v2 phase-gate enforcement model.

## Design

### Bare Invocation Contract

When invoked by name or slash command, the skill owns the workflow immediately. Any app idea in the same user message is context for Project Induction.

The first response should state that Project Induction is starting, that the agent will inspect the repository, and that it will propose the AI-team footprint before writing AI-team files or app code.

### Intent Separation

The user saying “I want to build X” after `/adaptive-ai-team-bootstrap` does not approve app planning, app scaffolding, package installation, or commits. It only provides product context for induction and team-shaping.

### Root Selection

If the invocation directory is empty, contains only skill installs, or contains nested app candidates, ask where to install the AI team before applying the footprint:

- current directory
- nested app directory
- both

The agent may still present an induction proposal, but must not apply a footprint until the root decision is explicit.

### Induction Ignore List

Induction sampling and project signals must ignore:

- `.agents/`
- `.claude/skills/`
- `.goose/skills/`
- `.pi/`
- `.next/`
- `node_modules/`
- `skills-lock.json`

### AGENTS Marker Validation

Generated `AGENTS.md` must include `Template-Version: adaptive-ai-team-bootstrap@0.1.0`. `check-ai-team.mjs` must fail when `AGENTS.md` exists but lacks this marker.

## Success Criteria

- `SKILL.md` contains bare invocation, intent separation, first response, no-route-away, and root selection rules.
- `init-ai-team.mjs --dry-run` does not sample installed copied skill files or report skill tests as project tests.
- `check-ai-team.mjs` fails for unrelated `AGENTS.md` content.
- Tests cover copied-skill-only induction and unrelated `AGENTS.md` rejection.
- `npm test`, `npm run check:skills`, and script syntax checks pass.
