# Forge Gate v2 Design: TypeScript Support + Dependency Rules

Date: 2026-08-26

Branch: continues work merged from PR #1 (`gauntlet` branch).

## Summary

Three additions to the forge-gate ecosystem, shaped by an adversarial review cycle:

1. **TypeScript support** in forge-gate's CRAP gate via a pluggable per-extension parser.
2. **Dependency-rule enforcement**: a new `--deps` gate whose rules are negotiated with the user by a standalone skill, never hardcoded.
3. **A guide** (not tooling) for dependency visualization, letting the host agent/harness choose how to render it.

Plus one documented deferral: junior-developer training mode.

## Goals

- Parse `.ts`, `.mts`, `.cts` for complexity analysis with exact line-number fidelity.
- Keep parsing pluggable per extension so future languages slot in without re-architecting.
- Let users co-create dependency rules through Socratic questioning instead of shipping opinions.
- Enforce negotiated rules deterministically through the same exit-code contract as every other gate.

## Non-Goals

- `.tsx` / JSX parsing (deferred; clean SetupError naming the limitation).
- Full type-aware analysis (complexity needs syntax only).
- Shipping a dashboard/UML renderer (guide only; host decides).
- Junior-developer training mode (**explicitly deferred, not dropped** — see Deferrals).
- Fixed, opinionated dependency rules shipped by default.

## 1. TypeScript Support

### Architecture

Parsing becomes pluggable per extension inside forge-gate:

```txt
src/parsers/
  index.mjs        # extension → parser dispatch
  javascript.mjs   # acorn (existing logic, extracted)
  typescript.mjs   # amaro strip → acorn
```

- Extensions `.ts`, `.mts`, `.cts` route through the TypeScript parser: transform types with **amaro** (transform mode, which is what handles non-erasable syntax), then hand the resulting JavaScript to the existing acorn analyzer.
- Amaro is chosen because it is the SWC-based transformer Node itself ships for `--experimental-strip-types`.
- Parameter properties (`constructor(private x)`) and decorators are NOT supported by amaro transform: files containing them fail with a clean SetupError naming the syntax.
- Amaro ships as a **runtime dependency** of forge-gate with a minimum version supporting transform mode; `engines` compatibility with Node ≥20 must be verified at adoption time.
- Complexity semantics are unchanged: CC counting operates on the transformed AST identically to JS files.

### Line-fidelity invariant (at-risk)

CRAP reports cite `file:line`. Transform-mode enum/namespace lowering expands code and may shift lines; fidelity is therefore an **at-risk invariant with a fallback**, not a settled property:

- Fixture tests must place function declarations *after* an expanded enum and a namespace and assert each function's parsed position equals its position in the original source (not merely equal line counts).
- Fallback: if amaro cannot hold line positions for a construct, forge-gate detects the shift (comparing post-transform declaration positions against source) and rejects that file with a SetupError telling the user the file cannot be scored for CRAP.

### Coverage pipeline for TypeScript

The CRAP gate joins complexity against Istanbul `coverage-final.json`. For `.ts` files this requires an executable pipeline:

- Supported pipeline: tests run under `node --experimental-strip-types` (or `tsx`) with `c8`, producing `coverage-final.json` whose keys contain the original `.ts` paths verbatim.
- End-to-end fixture test: one covered and one uncovered TS function produce correct per-function coverage and CRAP scores through the real c8 output format.
- If `.ts` paths are absent from coverage data, functions read as 0% covered — the staleness warning plus remediation text ("run your tests under node --experimental-strip-types + c8") must make the cause obvious.
- Default extensions become `[".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]`. `.jsx`/`.tsx` remain unsupported with a clean SetupError naming the limitation.

### Fidelity requirement

CRAP reports cite `file:line`. The strip step must preserve line numbers; the TypeScript parser module asserts this invariant (a round-trip test: stripping a fixture must not change line count).

### Dogfooding

forge-gate gains `.ts` test fixtures, and at least one real `.ts` source file in the package itself, so its own CRAP gate exercises the TypeScript path on every run.

## 2. Dependency-Rule Enforcement (`--deps` gate)

### Rules format

Negotiated rules live in the project's existing `forge-gate.config.json` under `dependencyRules`. Pattern-based, deny-by-default-optional, no fixed layer names:

```json
{
  "dependencyRules": {
    "rules": [
      { "from": "src/cli/**",     "allow": ["src/core/**", "src/util/**"] },
      { "from": "src/core/**",    "allow": ["src/core/**", "src/util/**"] },
      { "from": "src/util/**",    "allow": [] },
      { "from": "**",             "forbid": ["src/legacy/**"] }
    ],
    "allowNodeModules": true,
    "unmatched": "deny"
  }
}
```

Semantics:

- Globs use **picomatch** syntax, anchored at the repo root; negation patterns are not supported in v1.
- `from` / `allow` / `forbid` match against repo-relative file paths. First matching `from` rule wins. Within it, `forbid` beats `allow`. A target matching the file's own `from` pattern is implicitly allowed (sibling imports never violate). Targets neither allowed nor forbidden under the matched rule are denied.
- `allowNodeModules`: `true` (ignore all bare specifiers) or an array of globs matched against the resolved module path (e.g., `"@iamaamir/**"`). Default `true`.
- **Workspace packages are not external**: a bare specifier that resolves (via node_modules symlink or package.json `imports`) to a directory inside the repo participates in rule matching as its repo-relative path. Cross-package coupling is exactly what dependency rules exist to catch in a monorepo.
- Resolution rules for relative specifiers: extensionless specifiers resolve by trying configured extensions in order, then directory `index.*`; a relative specifier that cannot be resolved, or that escapes the repo root, is a gate failure with the offending file and specifier named (broken imports fail loudly).
- Unresolvable non-relative specifiers that do not resolve into the repo are treated as external per `allowNodeModules`.
- Scanned population: the deps gate scans `roots` filtered by `extensions` (same as CRAP). `unmatched` applies within this population: `"deny"` (default — scanned file with no matching `from` rule violates) or `"allow"`.
- Structural validation of `dependencyRules` mirrors v1 rigor — SetupError on: `rules` missing or not an array, a rule without `from`, `allow`/`forbid` not arrays of strings, unknown `unmatched` values, invalid glob syntax, and `"rules": []` combined with `"unmatched": "deny"` (denies everything — misconfiguration).

### Gate mechanics

- `forge-gate check --deps` runs FIRST in `GATE_ORDER`: it is the cheapest (purely static), and architecture violations should surface before deeper analysis runs.
- Import extraction walks each scanned file's AST for static `import` declarations, `export ... from`, dynamic `import()` calls with literal specifiers, and `require()` calls with literal specifiers (so `.cjs` files participate fully).
- Violations print `file → imported-file (violates rule N)` with remediation text, sorted by file with most violations first.
- No `dependencyRules` key configured → SetupError explaining how to run the `/forge-rules` skill.
- Non-literal dynamic imports (`import(someVariable)`) are silently skipped — documented non-goal.

## 3. The `/forge-rules` Skill

Standalone installable skill (`skills/engineering/forge-rules/`) usable independently of gauntlet runs.

Workflow:

1. **Analyze**: inventory directories, entry points, largest fan-in/fan-out files, existing boundary hints (folder structure, package boundaries, README claims). Present findings.
2. **Propose**: draft 3–7 candidate rules grounded in what the analysis actually found — never generic advice.
3. **Grill**: challenge the user on each rule and each undecided boundary. One question per message — never batch questions. The interaction pattern is harness-independent: if the host provides a structured-question mechanism (option lists with free-text fallback), use it; whatever the host offers — tools, slash commands, plain text — render the same structure through it. The skill names no specific tool. Every question MUST offer 2–4 concrete options grounded in the analysis (each with its trade-off stated in one line) plus the free-text escape hatch. The agent never asks an open-ended question it could have offered options for, and never presents options without having a recommendation marked. Each answer may open follow-up questions; the session continues until every branch of the decision tree is resolved. Unresolved questions block finalization.
4. **Finalize**: write agreed rules into `forge-gate.config.json`, run `forge-gate check --deps` immediately, and loop with the user until the codebase either passes or the user consciously accepts current violations as documented debt.
5. Record accepted violations in the project's state/decision notes so they are visible, not silent.

The skill contains zero hardcoded rule opinions — it brings process, not policy.

## 4. Dependency Visualization Guide

A reference document (in the forge-rules skill's `references/`) teaching the host agent/harness to render a dependency graph from the analyzed imports: recommended formats (Mermaid `graph`, DOT), node/edge conventions (directory-level collapse, violation edges highlighted), and instructions to let the host environment pick rendering. No rendering code ships in arc-forge.

## 5. Deferrals (documented, not silent)

- **Junior-developer training mode**: human-process design (new hires work under the same deterministic constraints without AI, then earn orchestration trust). Deferred; revisit after the gates stabilize. Recorded here and in the README philosophy section.
- **`.tsx`/JSX**: deferred pending parser decision.
- **UML viewer tooling**: replaced by the visualization guide above.

## Error Handling

Same contract as v1: 0 pass, 1 gate failure, 2 setup error. New setup errors: unparseable TS that survives stripping, missing `dependencyRules` when `--deps` requested, invalid glob syntax in rules.

## Testing

- Parser round-trip tests asserting function declaration positions survive transform (fixtures place functions after expanded enums/namespaces) — line counts alone are insufficient.
- Per-function coverage already proven on JS; add TS equivalents (one complex uncovered function in a covered file must flag), including the end-to-end c8 + `--experimental-strip-types` coverage join.
- Deps gate: fixture projects covering allow/forbid/unmatched/node-modules cases, first-rule-wins ordering, literal dynamic imports, require() extraction, workspace-specifier resolution, and unresolvable-relative failures.
- forge-rules skill: playbook consistency check (gate commands match CLI), like the gauntlet skill.

### Dogfooding acceptance (non-vacuous)

"CI stays green" is necessary but not sufficient. Acceptance requires:

1. A root `forge-gate.config.json` with negotiated rules containing at least one real arc-forge boundary (e.g., `packages/**` independent from `skills/**`, constraints on `scripts/**`).
2. A CI step running `forge-gate check --deps` (plus CRAP where feasible) at repo root.
3. A committed negative fixture: a deliberately violating file that demonstrably fails the gate in tests, proving the rules bite.
4. The forge-rules skill's negotiation transcript summarized into the config's decision notes.

## Implementation Units

Three independently shippable slices, in this order:

1. **TS support** — parser dispatch + amaro + fidelity fixtures + coverage-pipeline test. Acceptance: `.ts` file with an uncovered complex function fails CRAP correctly through a real c8 run; dogfood includes a `.ts` source file.
2. **Deps gate** — import extraction, rule evaluation, validation, gate wiring. Acceptance: fixture matrix green + violating-fixture negative test.
3. **forge-rules skill + viz guide** — playbooks, guide doc. Acceptance: skill discovery passes; a real negotiation session on arc-forge produces the root config from unit 2's dogfooding.

Each unit ships separately; TS support must not wait on glob-semantics debates and vice versa.
