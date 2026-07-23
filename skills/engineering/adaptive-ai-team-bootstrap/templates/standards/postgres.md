# PostgreSQL Standard

## Purpose

Use when changing PostgreSQL schemas, SQL, migrations, or data access.

## Rules

- Make migrations reversible or document why they are one-way.
- Add indexes only for proven query paths.
- Treat destructive data changes as high risk.

## Review Questions

- Is the migration order safe for deployed data?
- Are constraints aligned with domain rules?
