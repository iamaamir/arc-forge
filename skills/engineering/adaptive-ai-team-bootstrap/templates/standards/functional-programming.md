# Functional Programming Standard

## Purpose

Use when changing functional domain logic or data transformations.

## Rules

- Prefer explicit inputs and return values over hidden mutation.
- Keep transformations readable before making them clever.
- Avoid abstraction until two real call sites need it.

## Review Questions

- Can the function behavior be tested without global state?
- Are data transformations named in the project's domain language?
