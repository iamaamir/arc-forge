# Gauntlet State

Requirement: Forge Gate v2 — TypeScript support, dependency-rule enforcement (--deps), forge-rules skill + visualization guide. Spec: docs/superpowers/specs/2026-08-26-forge-gate-v2-design.md. Acceptance: features/v2-*.feature + docs/QA-v2.md.

## Gates

| Stage | Status | Notes |
|-------|--------|-------|
| 1 Specify | passed | user approved 6aa8bd5 |
| 2 Code | unit 2 done | TS support + deps gate shipped; unit 3 skill+guide pending |
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

### Unit 2 (deps gate) implementation decisions

- 2026-08-26: `--deps` is opt-in; bare `forge-gate check` still defaults to the v1 four gates. Defaulting deps ON would exit 2 for every project that has not yet negotiated dependencyRules — a breaking change smuggled into a minor release.
- 2026-08-26: precedence within the matched rule settled as: explicit forbid > implicit self-allow > explicit allow > deny-by-default. Self-allow is an allowance, and forbid beats any allowance; this keeps `{from:"src/**", forbid:["src/lib/evil.js"]}` biting even on intra-layer sibling imports.
- 2026-08-26: `rule N` in violation messages is the 1-based index into dependencyRules.rules.
- 2026-08-26: workspace-vs-installed boundary: a node_modules entry participates in rules only if its realpath escapes node_modules into repo source (npm-workspaces-style symlink). Plain installs physically under <root>/node_modules are external even though inside the repo tree — found by the first real dogfood run flagging acorn/amaro/picomatch imports.
- 2026-08-26: package.json `imports` (#specifiers): exact string targets plus single-`*` pattern substitution; arrays/conditional targets are documented non-goals in v1.
- 2026-08-26: allowNodeModules glob arrays match both the bare specifier's name-path (`@scope/pkg`) and the resolved node_modules-relative path.
- 2026-08-26: broken or repo-escaping relative imports are gate failures (exit 1), distinct from structural misconfiguration (SetupError, exit 2).
- 2026-08-26: root forge-gate.config.json gained `"roots": ["scripts","packages","skills"]` and `"fixtures"` ignore — the negotiated rules were scanning nothing (default roots ["src"] does not exist at repo root), making the gate vacuous. Rules themselves untouched.

## Improvement findings (skill friction log)

- **Nested coverage runs poison outer coverage**: Node force-propagates `NODE_V8_COVERAGE` to every spawned descendant even when the var is deleted from the child env; c8's merge then lets grandchild zero-count data overwrite real hits for the same script. Any test suite that spawns c8/node children must redirect `NODE_V8_COVERAGE` to a scratch-local dir. Cost: ~2h debugging mysterious CRAP-gate failures in forge-gate's own dogfood run.
- **amaro transform mode cannot satisfy line fidelity** for idiomatic TS: type-only declarations are deleted (not whitespace-padded), sourcemaps map every position to line 0, and codegen reflows formatting. The design's reject-on-shift fallback would reject most real-world files if positions were taken from the transform output verbatim. The strip-as-oracle hybrid resolves this; the v3 design should record it.
- **amaro `engines: node >=22` is inaccurate**: verified working on Node 20.20.2 (WASM). Documented rather than enforced.
- **c8 `--clean` inside an instrumented suite**: an inner `c8 --clean` can wipe shared V8 coverage dump dirs; same family of nested-coverage hazards as above.
- **macOS realpath vs /var symlink prefix**: temp dirs created under `/var/folders/...` resolve to `/private/var/folders/...`; comparing a realpath'd candidate against the unresolved cwd misclassifies everything as outside-repo. Any gate doing realpath containment checks must canonicalize BOTH sides. Same disease `coverage.mjs` canonicalize already treats.
- **Negotiated rules without a population are decorative**: root config had dependencyRules but no `roots`, so the deps gate scanned zero files and passed vacuously. The /forge-rules skill must always write `roots` alongside rules, and dogfooding acceptance should assert the scanned-file count is nonzero (candidate for a future gate summary line).
- **Root-level CRAP debt inventory (Clean-stage backlog, found 2026-08-26 running --crap at repo root)**: 16 violations in skills/** (adaptive-ai-team-bootstrap: checkPhaseCompletionEvidence CRAP 68, checkPackageScripts 16, shouldIgnoreProjectPath 16, projectRoot 14, parseArgs 11, markdownTableFirstColumnValues 9, renderProposal 10, init-ai-team.test 20, proposal-scripts.test 12; lesson-craft reference demos: lesson-components.js ×4, build-static.mjs) plus one-thing-functions rules.mjs `isAllowedConstructor` (26), one-thing-functions bin `runInit` (12), forge-gate bin `runCheck` (12), forge-gate tests/check.test.mjs `writeCoverageReport` (20). None introduced by unit 2; not silently weakened — queued for stage 3 Clean. Root mutation report does not exist yet; root `--mutation` correctly exits 2 until stage 4 Hardener produces it.
