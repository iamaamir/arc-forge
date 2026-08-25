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

- Extensions `.ts`, `.mts`, `.cts` route through the TypeScript parser: strip types with **amaro**, then hand the resulting JavaScript to the existing acorn analyzer.
- Amaro is chosen because it is the SWC-based stripper Node itself ships for `--experimental-strip-types`, handles erasable plus non-erasable syntax (enums, namespaces), and preserves line positions.
- Complexity semantics are unchanged: CC counting operates on the stripped AST identically to JS files.
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

- `from` / `allow` / `forbid` are glob patterns matched against repo-relative file paths.
- First matching `from` rule wins. Within it, `forbid` beats `allow`.
- Imports resolving outside the repo (`node_modules`, built-ins) are ignored unless `allowNodeModules` patterns say otherwise.
- `unmatched`: `"deny"` (default — any file with no matching rule violates) or `"allow"`.

### Gate mechanics

- `forge-gate check --deps` joins `GATE_ORDER` between `crap` and `mutation`.
- Import extraction walks each scanned file's AST for static `import` declarations, `export ... from`, and dynamic `import()` calls (dynamic imports resolve literal specifiers only).
- Relative specifiers resolve to repo-relative paths; violations print `file → imported-file (violates rule N)` with remediation text, worst-first style consistent with other gates.
- No `dependencyRules` key configured → SetupError explaining how to run the `/forge-rules` skill.

## 3. The `/forge-rules` Skill

Standalone installable skill (`skills/engineering/forge-rules/`) usable independently of gauntlet runs.

Workflow:

1. **Analyze**: inventory directories, entry points, largest fan-in/fan-out files, existing boundary hints (folder structure, package boundaries, README claims). Present findings.
2. **Propose**: draft 3–7 candidate rules grounded in what the analysis actually found — never generic advice.
3. **Grill**: challenge the user on each rule and each undecided boundary ("should `util` really import from `core`? what happens when it needs a logger?"). Resolve every branch of the decision tree. Unresolved questions block finalization.
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

- Parser round-trip tests (line fidelity) for TS fixtures including enums and namespaces.
- Per-function coverage already proven on JS; add TS equivalents (one complex uncovered function in a covered file must flag).
- Deps gate: fixture projects covering allow/forbid/unmatched/node-modules cases, first-rule-wins ordering, dynamic imports.
- forge-rules skill: playbook consistency check (gate commands match CLI), like the gauntlet skill.
- Dogfood: negotiate real rules for arc-forge itself via the skill process and ship them in the root `forge-gate.config.json`; CI stays green means the gate works.
