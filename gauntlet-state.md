# Gauntlet State

Requirement: Forge Gate v2 — TypeScript support, dependency-rule enforcement (--deps), forge-rules skill + visualization guide. Spec: docs/superpowers/specs/2026-08-26-forge-gate-v2-design.md. Acceptance: features/v2-*.feature + docs/QA-v2.md.

## Gates

| Stage | Status | Notes |
|-------|--------|-------|
| 1 Specify | passed | user approved 6aa8bd5 |
| 2 Code | unit 1 done | TS support shipped; units 2 deps gate, 3 skill+guide pending |
| 3 Clean | pending | worst CRAP before: tbd |
| 4 Harden | pending | final mutation score: tbd |
| 5 QA | pending | docs/QA-v2.md |

## Decisions

- 2026-08-26: amaro transform mode chosen over strip mode and ts-blank-space (user-selected)
- 2026-08-26: .tsx deferred; param properties/decorators unsupported with clean SetupError
- 2026-08-26: deps gate runs FIRST in GATE_ORDER (cheapest static gate)
- 2026-08-26: root forge-gate.config.json negotiated via live grilling session (daf423c)

### Unit 1 (TypeScript support) implementation decisions

- 2026-08-26: amaro transform-mode sourcemaps are unusable for line restoration (every generated line maps to source line 0) — reject-on-shift is enforced via a different mechanism than spec'd: amaro strip mode (whitespace-padding, position-exact) is run as a position oracle alongside the transform parse; reported lines are oracle lines, so most files score with true original positions. Files where strip fails (enums, namespaces — non-erasable) are rejected with a SetupError quoting amaro's construct-naming message.
- 2026-08-26: param properties + decorators rejected via original-source regex pre-checks, chosen after observing that transform mode silently lowers param properties and passes decorators through to acorn (which then fails without naming the syntax).
- 2026-08-26: dogfood decision: no `.ts` conversion inside `src/` yet (package must stay runnable pre-TypeScript-pipeline); dogfood path validated via the real-c8 end-to-end test instead. Spec §1 "at least one real .ts source file in the package itself" deferred to a follow-up once the team accepts Node ≥20 + amaro WASM as a hard runtime dep in src.

## Improvement findings (skill friction log)

- **Nested coverage runs poison outer coverage**: Node force-propagates `NODE_V8_COVERAGE` to every spawned descendant even when the var is deleted from the child env; c8's merge then lets grandchild zero-count data overwrite real hits for the same script. Any test suite that spawns c8/node children must redirect `NODE_V8_COVERAGE` to a scratch-local dir. Cost: ~2h debugging mysterious CRAP-gate failures in forge-gate's own dogfood run.
- **amaro transform mode cannot satisfy line fidelity** for idiomatic TS: type-only declarations are deleted (not whitespace-padded), sourcemaps map every position to line 0, and codegen reflows formatting. The design's reject-on-shift fallback would reject most real-world files if positions were taken from the transform output verbatim. The strip-as-oracle hybrid resolves this; the v3 design should record it.
- **amaro `engines: node >=22` is inaccurate**: verified working on Node 20.20.2 (WASM). Documented rather than enforced.
- **c8 `--clean` inside an instrumented suite**: an inner `c8 --clean` can wipe shared V8 coverage dump dirs; same family of nested-coverage hazards as above.
