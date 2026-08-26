# Arc Forge — Development Process

## Adversarial review gate (mandatory)

Every feature, plan, design discussion, or major decision gets an independent adversarial
review before being considered final:

1. **Feed the source material verbatim.** Reviews are always grounded in the original text
   that motivated the work (e.g., the Uncle Bob "Gauntlet" workflow summary below). Never
   summarize, truncate, or paraphrase it for the reviewer — hand it over as-is so gaps
   against the actual intent can be found.
2. **Use the Axiom persona** (elite principal-level reviewer; merciless but never arbitrary;
   every criticism backed by concrete rationale and fix; verdict lines SHIP IT / FIX FIRST).
3. **Review the fixes too.** When a review produces fixes, the fix batch itself gets a fresh
   adversarial pass — fixes introduce new bugs.
4. **Track findings to closure**: must-fix before merge, should-fix tracked, acceptable
   deviations written down as documented non-goals (never silently dropped).
5. **Use the operational playbook.** Reviews execute
   `skills/engineering/gauntlet/references/axiom-review.md` — it proceduralizes verbatim-read
   mechanics, severity assignment, verification depth, read-only constraints, and the report
   template so review quality does not depend on model tier.
6. **Single ledger.** `LEDGER.md` is the mandatory home for all findings (DEFECTS), employer
   rulings (RULINGS), and accepted deviations (NON-GOALS) — one ledger, no split-brain across
   scratch files or changelogs. Fix-batch commit messages MUST reference the ledger IDs they
   close; reviewers verify closure against that file, not changelogs.

## Dogfooding mandate

Every tool this repo ships must be validated by running its own gates on itself before it
ships to others. Bugs found this way are logged and feed back into improvements. New
capabilities (e.g., dependency-rule gates) must include self-validation in their definition
of done.

## Source material

The founding design input for the forge-gate package and gauntlet skills is Uncle Bob's
interview describing the "Gauntlet" workflow. The authoritative source is the full
verbatim transcript at `docs/unclebob-transcript.txt` — it supersedes any summary. Every
adversarial review of work derived from it MUST feed that file to the reviewer verbatim
(the reviewer reads it from disk, untrimmed). Summaries are lossy: the summary previously
used here missed the Hardener's 100%-coverage mandate, the Cleaner's general-code-review
duty, the QA agent's executable-script requirement, and the ephemeral-specs stance.

For quick orientation only (never a substitute for the transcript): the workflow is
Specifier (Gherkin + QA procedure) → Coder (unit tests + code, mess allowed) →
Cleaner (CRAP analysis AND general code review) → Hardener (merciless mutation testing,
100% coverage) → QA agent (executes the QA doc as an executable script with a
deterministic result). Deterministic over steering; agents born/task/die with clean
contexts; parallel coders; thresholds widened for agents (CRAP 6–8 vs human 4); TDD not
imposed on agents; specs ephemeral; agile fiddle-over-plan; fundamentals endure.
