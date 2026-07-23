# Testing Standard

## Purpose

Use when adding features, fixing bugs, or changing behavior.

## Rules

- Prefer tests that fail for the intended reason before implementation.
- Test user-visible behavior and important domain rules.
- Keep brittle implementation assertions out of high-level tests.

## Review Questions

- Would the test fail if the bug returned?
- Is there verification evidence for commands that were run?
