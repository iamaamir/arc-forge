# Memory Policy

`docs/ai-team/Memory.md` preserves cross-session continuity.

## Allowed Memory

- stable project facts
- approved terminology
- architecture decisions worth remembering
- user/team preferences
- recurring workflows
- known constraints and risks
- current team structure
- ownership notes
- important open questions

## Required Metadata

Durable memory entries must include when the information is important enough to guide future agent behavior:

- source or provenance
- date
- confidence
- scope
- review status

## Forbidden Memory

- secrets, credentials, tokens, private keys
- unreviewed personal or sensitive data
- speculation promoted as fact
- transient task notes
- raw tool output dumps

## Update Rules

- Propose memory updates at task completion or explicit review points.
- Mark contradictions and resolve them intentionally.
- Compact long sections into sourced summaries when context pressure grows.
- Require human approval for memory changes that affect future agent behavior.
