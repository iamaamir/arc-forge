# Stage 2: Propose

Input: stage-1 findings.

Draft 3–7 candidate rules grounded in what the analysis actually found. Never generic advice.

Each candidate rule states:

- The `from` glob (repo-relative, picomatch syntax) and what it covers in *this* repo.
- Its proposed `allow` / `forbid` targets.
- The finding it is based on. A citation names the actual file or edge from the analysis ("`<entry-point>` imports N internal modules") and always beats an unanchored principle ("entry points should not reach into internals").
- Open questions the user must settle — these become Grill questions.

Also propose:

- `roots`: the directories the gate should scan, derived from the population check.
- `unmatched`: whether files matching no rule are denied or allowed — present both consequences for this codebase's actual unmatched population.
- `allowNodeModules`: default true unless analysis found workspace packages resolving inside the repo that should be governed.

Rules are candidates, not conclusions. Expect the Grill stage to kill some, split some, and spawn follow-ups.
