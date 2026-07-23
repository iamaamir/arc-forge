# Security Standard

## Purpose

Use when changing authentication, authorization, secrets, logging, storage, networking, or dependencies.

## Rules

- Never copy secrets into docs, memory, logs, or task files.
- Treat auth and data exposure changes as high risk.
- Prefer deny-by-default access rules.

## Review Questions

- Could logs, screenshots, or artifacts expose secrets?
- Are authorization checks enforced server-side where needed?
