# Next.js Standard

## Purpose

Use when changing Next.js routing, rendering, configuration, or build behavior.

## Rules

- Use non-interactive verification commands.
- Prefer framework-supported routing and data-loading patterns already used by the project.
- Treat deprecated interactive commands as blockers in automation.

## Review Questions

- Does `package.json` avoid deprecated `next lint` scripts?
- Did build or typecheck run after framework-level changes?
