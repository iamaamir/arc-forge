# Stage 1: Analyze

Input: the project root.

Build a factual picture of how the code currently talks to itself. Present findings before proposing anything.

## Inventory

1. **Directories**: list source directories and their rough role (entry points, libraries, scripts, tests). Note package/workspace boundaries from `package.json` workspaces or multiple manifests.
2. **Entry points**: files with no incoming imports (CLIs, bins, index files, config-run scripts).
3. **Fan-in / fan-out**: which files or directories are imported most (fan-in) and which import the most (fan-out). Two ways to get this, use either:
   - Run `forge-gate check --deps` if rules already exist — its output names violating edges directly.
   - Grep import statements (`import`/`require`/`export ... from`) across the roots and count edges.
4. **Boundary hints**: folder naming conventions, README architecture claims, existing lint/boundaries config, monorepo package splits. These are evidence of intent, not proof — the user decides what is real.

## Population check

Determine which directories contain code that should be *scanned* by the gate. If no `forge-gate.config.json` exists yet, note now: rules without `roots` are decorative — the gate only scans what `roots` names. Whatever rules come out of this session, `roots` must be proposed alongside them and cover the real source population (not just a default like `src` that may not exist here).

Present findings as a compact summary: directories, entry points, top fan-in/fan-out edges, boundary hints, current config state. Then move to Propose.
