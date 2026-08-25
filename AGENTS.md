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

## Dogfooding mandate

Every tool this repo ships must be validated by running its own gates on itself before it
ships to others. Bugs found this way are logged and feed back into improvements. New
capabilities (e.g., dependency-rule gates) must include self-validation in their definition
of done.

## Source material

The founding design input for the forge-gate package and gauntlet skill is the following
summary of Uncle Bob's "Gauntlet" workflow. It must be included verbatim in every
adversarial review of work derived from it:

---

# The "Gauntlet" Workflow: Deterministic Over Steering

Uncle Bob has moved away from "steering" agents with massive prompt documents (like agent.md), noting that LLMs treat long instructions as "guidelines" and suffer from the "lost in the middle" phenomenon where context gets diluted.

Instead, he uses a deterministic multi-agent gauntlet:

Specifier: Converts human requirements into Gherkin (Given/When/Then) acceptance tests and QA procedures.
Coder: Writes the code and unit tests to pass the Gherkin specs (often creating "messy" code).
Cleaner: Runs CRAP analysis (Combined Rating of Abstraction and Performance) to reduce cyclomatic complexity and refactor the code.
Hardener: Runs Mutation Testing (flipping signs/operators to ensure tests catch the changes) to achieve near 100% test coverage and robustness.
QA Agent: Executes the system-level tests.
Key Insight: He accepts that agents are fast but make messes. By constraining them with automated tools that force them to loop until code passes strict metrics, he achieves a 4x–5x productivity boost over humans while maintaining higher quality.

🧠 Strategic vs. Tactical Programming
Bob distinguishes between two levels of work:

Tactical: Writing the actual code. This is now the domain of agents.
Strategic: Designing architecture, managing complexity, and ensuring the system makes sense. This remains the human domain.
The Problem: If agents do all the coding, how do junior developers learn to be strategic? Bob's Solution:

New hires should be treated like agents. They must spend months working under the same strict deterministic constraints (CRAP scores, mutation testing) without the "crutch" of AI.
This forces them to understand the consequences of bad code and the value of structure, just as an agent would.
Only after mastering this "gauntlet" should they be trusted to orchestrate agents strategically.
🏛️ Architecture and Modules
Deep Modules: Bob agrees with John Ousterhout's concept of "deep modules" (small interface, complex hidden implementation). This helps agents (and humans) focus on what a module does without getting lost in how it works.
Abstraction: He built an architecture viewer (UML generator) to visualize dependencies. He uses deterministic tools to enforce dependency rules (e.g., Module A cannot depend on Module B). If agents violate this, the tool forces a fix.
Complexity Thresholds: Humans have low short-term memory, so Bob's Clean Code rules (e.g., keep functions tiny) were necessary. Agents have massive context, so he has raised the threshold for acceptable complexity (e.g., allowing a CRAP score of 6–8 instead of 4).
TDD Evolution: He no longer enforces strict Test-Driven Development (write test, then code, repeat) on agents. Instead, he allows them to write a function and then its test, as this matches their processing style better.
🚫 The Fallacy of "Spec-Driven Development"
Bob strongly advises against heavy upfront planning or "spec-driven development" where humans write massive documents before coding begins.

Why it fails: Agents will follow a plan literally but lack the wisdom to handle unforeseen edge cases, leading to a "waterfall" disaster.
The Agile Approach: He advocates for an agile feedback loop: do a little bit, get feedback, reorganize, and repeat.
Cost of Change: Because AI makes coding cheap, the cost of change has plummeted. It is better to "fiddle" and iterate than to try to predict the perfect architecture upfront.
📚 The Enduring Value of Fundamentals
Despite the rise of AI, Bob insists that software fundamentals still matter.

Software is the most complex thing humans create.
Fundamentals (data structures, algorithms, architecture) are the only way to organize that complexity so it can be conceived by both humans and AI models (which are modeled after humans).
He warns that those who ignore fundamentals will eventually hit a "wall" where the AI can no longer handle the mess, and they will have no idea how to fix it.

---
