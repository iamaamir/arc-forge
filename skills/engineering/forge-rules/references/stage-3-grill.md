# Stage 3: Grill

Input: stage-2 candidates. Output: a fully resolved decision tree. This is the heart of the skill — encode the protocol exactly.

## The protocol

**One question per message. Never batch questions.** If you have three open questions, that is three messages.

**Use the host harness's structured-question mechanism if it has one** (option lists plus free-text fallback). Otherwise render the identical structure in plain text. Whatever mechanism the host offers — tools, slash commands, forms — the structure below is invariant. Do not name or assume any specific harness tool.

## Every question MUST have

1. **2–4 concrete options grounded in the analysis.** Each option names actual files/directories from this session's findings.
2. **A one-line trade-off per option.** What it buys, what it costs.
3. **Exactly one option marked as the recommendation** (e.g., "Recommended:"). Never present options without taking a position.
4. **An explicit escape hatch**: the user may type their own answer instead of picking an option.

Never ask an open-ended question that could have been offered as options. Never bury two decisions in one question.

## Text rendering template

```txt
Q3: Should <dir-a> be allowed to import <dir-b>?

1. Allow both directions — simplest; loses the ability to catch cycles later
2. Allow one-way (<dir-a> → <dir-b>) only — Recommended; matches the fan-out found in <file>
3. Forbid entirely — strictest; will flag the N existing imports found in analysis

Or type your own answer.
```

Adapt wording to the host's structured mechanism; keep all four elements.

## Branching

Each answer may spawn follow-up questions (an accepted boundary often raises "what about X?"). Continue until every branch of the decision tree is resolved:

- Every candidate rule has an explicit verdict: agreed, modified, or dropped.
- Every undecided boundary surfaced by Propose or by an answer has been asked about.
- `roots`, `unmatched`, and `allowNodeModules` have explicit user decisions.

Unresolved questions block finalization. If the user wants to stop early, record the open questions in decision notes — they are unresolved debt, not defaults.

When the tree is resolved, move to Finalize.
