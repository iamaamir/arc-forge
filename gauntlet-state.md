# Gauntlet State

Requirement: Forge Gate v2 — TypeScript support, dependency-rule enforcement (--deps), forge-rules skill + visualization guide. Spec: docs/superpowers/specs/2026-08-26-forge-gate-v2-design.md. Acceptance: features/v2-*.feature + docs/QA-v2.md.

## Gates

| Stage | Status | Notes |
|-------|--------|-------|
| 1 Specify | passed | user approved 6aa8bd5 |
| 2 Code | unit 3 done | TS support + deps gate + forge-rules skill shipped; all units complete |
| 3 Clean | passed | worst CRAP before: 68 (checkPhaseCompletionEvidence); 19 violations → 0 |
| 4 Harden | passed | mutation score 77.32 → **92.32** (1046 detected / 1133); gate `check --mutation` exit 0; 87 survivors documented equivalent |
| 5 QA | pending | docs/QA-v2.md |

## Decisions

- 2026-08-26: Clean stage — CRAP gate driven to 0 without threshold changes. Worst offender `checkPhaseCompletionEvidence` (CRAP 68) split into per-artifact evidence checkers; conditional ladders in `shouldIgnoreProjectPath`/`parseArgs`/lesson-craft components replaced with lookup tables and small helpers.
- 2026-08-26: Bug fix during Clean (behavior-affecting, logged per dogfooding mandate): `build-static.mjs` called `rm()` without importing it — any rebuild with an existing `dist/` crashed with a ReferenceError swallowed by `.catch(console.error)`. Import added so resetDist works as designed.
- 2026-08-26: Documented risk / non-goal: lesson-craft reference files (`lesson-components.js`, `build-static.mjs`) have no test harness (browser DOM components; no jsdom/happy-dom dep available). Refactors verified by inspection + syntax check only. A future harness or a headless smoke test would close this gap.
- 2026-08-26: one-thing-functions arg-count audit on touched files: baseline 17 findings → fewer after refactor (e.g. the 26-line lesson-nav callback is gone). Remaining multi-arg helpers are pre-existing style accepted across the repo; CRAP ≤ 8 is the enforced gate, arg-count is advisory here.

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

### Unit 4 (Harden stage) decisions

- 2026-08-26: mutation score raised 77.32 → 92.32 (1042 killed + 4 timeout of 1133) across three stryker iterations, without lowering any threshold. Kill strategy: exact full-message equality assertions (loose regexes were matching the WRONG error path — e.g. `/parameter propert/i` matched amaro's strip-only rejection instead of the param-property pre-check, hiding 13 regex mutants), boundary tests (score == threshold, CRAP == threshold, mtime == mtime), scan-order-controlled sort assertions, dotted-glob crossing, `new require()`/non-literal require cases, and TS sources through the deps gate.
- 2026-08-26: dogfood gap closed: packages/forge-gate now ships its own forge-gate.config.json (src self-contained + profiles allow; bin may import src) so `check --deps --crap --mutation` exits 0 from the package dir. Found by running the package's own gates on itself per the dogfooding mandate.
- 2026-08-26: test files count as 0%-coverage code for the repo-root CRAP gate (c8 only reports loaded src), so every new test-file function is held to cc ≤ 2 (CRAP 6 ≤ 8 uncovered). Two offenders found by the gate itself and split into cc ≤ 2 helpers.
- 2026-08-26: documented equivalent survivors (87 total, accepted — behavior genuinely identical or unreachable):
  - Buffer-vs-utf8 `readFileSync(path, "")` mutants (mutation.mjs:12, config.mjs:29, coverage.mjs:15, crap.mjs:24, deps.mjs:89): JSON.parse/acorn handle Buffers identically on these paths; empirically confirmed with a non-ASCII identifier test that already passes under the mutant.
  - deps.mjs literalString typeof cluster (127:x): extractImports re-checks `typeof literal === "string"`, so literalString's own check is doubly guarded; require(42)-style mutants are filtered before resolution.
  - deps.mjs matcher cache (70:11 true → always recompile, 72:9 drop cache-set): performance-only, results identical.
  - deps.mjs MULTILINE_PARAM_PROPERTIES regex (all 8 line-14 mutants): fully redundant — `\s` in PARAM_PROPERTIES already matches `\n`, so the multiline alternative can never change the OR result. Cleanup candidate: delete the redundant regex in a future refactor.
  - typescript.mjs positionsUsable cluster (62:x, 72:x, 73:x) plus shifted-lines message parts (64:7, 65:9) and strip-options `{}` (54:38 — amaro's DEFAULT mode is strip-only): defensive code unreachable because rejectUnsupportedSyntax and the strip-error catch intercept every construct that could desync oracle vs transform function lists.
  - javascript.mjs junk-registration directions (53:7 ×2, 59:7, 65:7 ×3): mutating registration guards to `true` only inserts entries keyed by nodes never queried; names.get misses fall back to "(anonymous)" identically. Optional-chaining removals (60:x) are covered by the `?? node.key.value` fallback. 74:36 `node.body !== body` → `true` is a tautology within its guard (a body node never equals the outer body).
  - coverage.mjs suffix-form fallbacks (42:x, 43:x): canonicalized exact-key matching makes form1/form2 mutually redundant (form2 duplicates form1 whenever the file is missing; existing files hit the exact map), and junk forms ("Stryker was here!", global `./` replace) can never suffix-match absolute real keys.
  - deps.mjs validation dead paths: assertValidGlob try/catch (471-474) is unreachable — picomatch.makeRe did not throw on any probed input (verified over 22 pathological globs); the where-labels feeding it (449:30/38, 463:59, 474:26) inherit unreachability; assertNonEmptyPatternString non-string branches (479:7, 481:36) are pre-filtered by array-of-strings checks; empty-rules early-return disjunct (426:36) only matters when the other disjunct already returns.
  - deps.mjs sort inner ternary (46:31 ×4): comparator-consistency edge unobservable through Array.prototype.sort — TimSort's binary insertion only consults the comparison arm that stays correct; outer ordering verified by dedicated reverse-scan-order tests.
  - deps.mjs defensive resolution branches: unmatched-reason "" (246:49) — brokenImportMessage treats every non-"escapes" reason with the same text; kind "relative"→"" (247:18) empirically equivalent end-to-end; insideRoot exact-root disjunct (314:10) and dangling-realpath classify branch (300:x) unreachable behind existsSync/realpathSync pre-checks; toNodeModulesPath index===-1 arm (328:10) unreachable for real node_modules candidates; slice offset ±path.sep.length (328:20) identical while path.sep length is 1 (POSIX-only divergence).
  - deps.mjs subpath-import guards (359:18, 360:7, 366:19, 375:7, 377:7 CE-false directions): falsy targets flow through the same `typeof !== "string"` exit as the original early returns.
  - commands.mjs defaultCommandTimeoutSeconds "" (9:17): observable only via a command running >300s with the default timeout; accepted. Template concat mutant (22:15) produces identical output ordering.
  - Known anomaly: deps.mjs:333 MethodExpression (`specifier.split("/").slice(0,2).join("/")` → `specifier.split("/")`) is reported Survived but hand-applying exactly that replacement fails two scoped-workspace tests. Tracked for follow-up investigation (suspect instrumenter/mutant-switching nuance), not silently dropped.
- 2026-08-26: runtime note: full-suite-per-mutant command runner completes in ~9 minutes at 1133 mutants (~0.5s/suite); no fast-split Stryker config needed.

### Unit 3 (forge-rules skill + viz guide) implementation decisions

- 2026-08-26: grill protocol encoded harness-agnostically: the four invariants (one question per message, 2–4 grounded options with one-line trade-offs, exactly one marked recommendation, free-text escape) are stated as structure, with instruction to use whatever structured-question mechanism the host offers and never naming a tool.
- 2026-08-26: `roots` written as a TOP-LEVEL config key (not nested under dependencyRules) — matches real config semantics validated by deps.mjs; skill's finalize playbook states the merge rule explicitly (don't clobber `ignore`/thresholds).
- 2026-08-26: adversarial review stripped repo-specific examples (`scripts/release.mjs`) from the reusable propose playbook — installed into foreign projects they would prime arc-forge-shaped opinions, violating the no-hardcoded-opinions scenario. Grounding is taught via abstract placeholders instead. Debt recording moved to acceptance-time inside the red-gate loop (batched wrap-up recording could be lost on session end).
- 2026-08-26: documented non-goal: grill playbook's text template contains concrete-sounding option wording around placeholder dirs — it illustrates structure, not policy; future edits must keep template options anchored to placeholders only.

## Improvement findings (skill friction log)

- **Nested coverage runs poison outer coverage**: Node force-propagates `NODE_V8_COVERAGE` to every spawned descendant even when the var is deleted from the child env; c8's merge then lets grandchild zero-count data overwrite real hits for the same script. Any test suite that spawns c8/node children must redirect `NODE_V8_COVERAGE` to a scratch-local dir. Cost: ~2h debugging mysterious CRAP-gate failures in forge-gate's own dogfood run.
- **amaro transform mode cannot satisfy line fidelity** for idiomatic TS: type-only declarations are deleted (not whitespace-padded), sourcemaps map every position to line 0, and codegen reflows formatting. The design's reject-on-shift fallback would reject most real-world files if positions were taken from the transform output verbatim. The strip-as-oracle hybrid resolves this; the v3 design should record it.
- **amaro `engines: node >=22` is inaccurate**: verified working on Node 20.20.2 (WASM). Documented rather than enforced.
- **c8 `--clean` inside an instrumented suite**: an inner `c8 --clean` can wipe shared V8 coverage dump dirs; same family of nested-coverage hazards as above.
- **macOS realpath vs /var symlink prefix**: temp dirs created under `/var/folders/...` resolve to `/private/var/folders/...`; comparing a realpath'd candidate against the unresolved cwd misclassifies everything as outside-repo. Any gate doing realpath containment checks must canonicalize BOTH sides. Same disease `coverage.mjs` canonicalize already treats.
- **Negotiated rules without a population are decorative**: root config had dependencyRules but no `roots`, so the deps gate scanned zero files and passed vacuously. The /forge-rules skill must always write `roots` alongside rules, and dogfooding acceptance should assert the scanned-file count is nonzero (candidate for a future gate summary line). Resolved for the skill side: stage-1 analyze carries a mandatory population check and finalize always writes `roots`.
- **Reusable skills must not carry host-repo examples**: the first draft of stage-2-propose cited a real arc-forge file as an example of "grounded" proposing. Any example embedded in an installable skill becomes a shipped opinion once installed elsewhere. Rule of thumb going forward: examples in skills/ use placeholders, never this repo's paths.
- **Root-level CRAP debt inventory (Clean-stage backlog, found 2026-08-26 running --crap at repo root)**: 16 violations in skills/** (adaptive-ai-team-bootstrap: checkPhaseCompletionEvidence CRAP 68, checkPackageScripts 16, shouldIgnoreProjectPath 16, projectRoot 14, parseArgs 11, markdownTableFirstColumnValues 9, renderProposal 10, init-ai-team.test 20, proposal-scripts.test 12; lesson-craft reference demos: lesson-components.js ×4, build-static.mjs) plus one-thing-functions rules.mjs `isAllowedConstructor` (26), one-thing-functions bin `runInit` (12), forge-gate bin `runCheck` (12), forge-gate tests/check.test.mjs `writeCoverageReport` (20). None introduced by unit 2; not silently weakened — queued for stage 3 Clean. Root mutation report does not exist yet; root `--mutation` correctly exits 2 until stage 4 Hardener produces it.
