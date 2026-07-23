# Rust Standard

## Purpose

Use when changing Rust code, crates, or command-line tools.

## Rules

- Prefer explicit error types or context-rich errors.
- Keep ownership and lifetime choices simple before optimizing.
- Run formatting, linting, and tests when Rust files change.

## Review Questions

- Are panics limited to impossible states or tests?
- Is error context useful to callers?
