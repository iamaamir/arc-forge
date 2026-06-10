# Learning Record Format

Learning records live in `./learning-records/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc. Create the directory lazily — only when the first record is written.

They serve **two purposes**: (1) capture the learner's demonstrated understanding (the ADR-style reflection from the teach skill), and (2) **form the agent's adaptation signal** for the next lesson.

## Template (minimal)

```md
# {Short title}

{1-3 sentences: what was learned, and why it matters for future sessions.}
```

## Extended template (with adaptation signal)

Use the extended form when the session revealed something about *how* the learner engages:

```md
# {Short title}

## Evidence
{What the learner did or said that demonstrated understanding}

## Challenges
{What was difficult, confusing, or where they asked questions}

## Engagement Pattern
{How they interacted with the demo: heavy replaying, lots of command experimentation, asking why questions, reading source, running tests, etc.}

## Adjust
{What to change for the next lesson, based on the pattern observed. Use these heuristics:}

- **Conceptual challenge** → Add more scaffolding text before the demo; introduce prerequisite concept first
- **Demo UX friction** → Simplify controls, add labels, fix timing, enlarge click targets
- **Low engagement** → Try a different demo pattern from `references/demo-patterns.md`; shorten reading sections
- **High engagement** → Double down: more of the same pattern in next lesson; add a stretch exercise
- **Learner went off-script** → They're curious about something adjacent — consider a side-lesson before returning to the main path
```

## When to write a learning record

Write one when any of these is true:

1. **The user demonstrated genuine understanding** — not just exposure, but evidence they can use the concept correctly. This sets a new floor for what to teach next.
2. **The user disclosed prior knowledge** — "I already know X." Record it so future sessions don't re-teach it. Also record the *depth* claimed.
3. **A misconception was corrected** — the user previously believed something wrong and now sees why. These are high-value: they predict future stumbling blocks for related topics.
4. **The mission shifted** — the user discovered they cared about something different than they thought. Cross-link to MISSION.md and update it.
5. **The engagement pattern is notable** — the learner thrives on a particular demo style, or struggles with another. Record it so the pattern becomes part of the adaptation signal.

### What does *not* qualify

- Material that was merely covered. Coverage is not learning. Wait for evidence.
- Anything already captured tersely in the glossary as a term definition. Don't duplicate.
- Session-by-session activity logs. Learning records are not a journal — they are decision-grade insights.

## Supersession

When a later record contradicts an earlier one (the learner's understanding deepened or corrected), mark the old record `Status: superseded by LR-NNNN` rather than deleting it.
