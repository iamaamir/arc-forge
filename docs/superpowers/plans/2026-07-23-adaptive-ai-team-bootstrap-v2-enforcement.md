# Adaptive AI Team Bootstrap V2 Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `adaptive-ai-team-bootstrap` from a scaffold generator into an enforceable AI-team operating model with phase gates, runtime evidence, role routing, standards cards, and stronger validation.

**Architecture:** Keep the existing dependency-free Node script approach and template-first skill layout. Add small focused helpers in existing scripts, add one new `complete-phase.mjs` helper, and extend generated templates so process enforcement is visible to future agents.

**Tech Stack:** Node.js ESM scripts, `node:test`, Markdown templates, dependency-free filesystem helpers.

---

## File Structure

- Modify `skills/engineering/adaptive-ai-team-bootstrap/SKILL.md`: document phase gates, role routing, standards activation, and new helper commands.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/references/operating-model.md`: make runtime traces and phase gates part of the daily workflow.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/references/governance.md`: make failed verification and failed reviews blockers.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/references/project-induction.md`: add `.gitignore` and standards discovery to induction.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/AGENTS.md`: expose generated project rules for phase gates, runtime traces, and active standards.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/workflow.md`: add blocking phase-gate flow.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/governance.md`: add blocking review and verification verdicts.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/team.md`: add Product Manager and specialist role routing guidance.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/decision-rights.md`: align default role names with `team.md`.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/task-brief.md`: add active standards and phase gate sections.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/review-report.md`: add standards review, verification evidence, blocking verdict, and next-phase approval.
- Create `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/phase-completion.md`: template for phase completion evidence.
- Create `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/verification-log.md`: template for command evidence.
- Create role templates in `skills/engineering/adaptive-ai-team-bootstrap/templates/roles/`: `product-manager.md`, `ux-ui-specialist.md`, `frontend-engineer.md`, `backend-engineer.md`, `security-iam-reviewer.md`, `seo-specialist.md`, `collaboration-realtimes-specialist.md`, `infra-devops-specialist.md`, `data-analytics-specialist.md`.
- Create standards templates in `skills/engineering/adaptive-ai-team-bootstrap/templates/standards/`: `universal.md`, `user-style.md`, `functional-programming.md`, `function-shape.md`, `react.md`, `nextjs.md`, `rust.md`, `postgres.md`, `testing.md`, `security.md`, `accessibility.md`.
- Create `skills/engineering/adaptive-ai-team-bootstrap/templates/gitignore/node.md`: generated `.gitignore` baseline.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/shared.mjs`: add safe text/table helpers used by validators.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.mjs`: copy standards, verify specialist template coverage, and safely create `.gitignore` for fresh projects.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs`: support `--phase` and `--standards`.
- Create `skills/engineering/adaptive-ai-team-bootstrap/scripts/complete-phase.mjs`: create phase completion artifacts and enforce waiver behavior.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs`: add process-bypass validation.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.test.mjs`: cover standards and `.gitignore` bootstrap.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/proposal-scripts.test.mjs`: cover `new-task --phase` and `complete-phase`.
- Modify `skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.test.mjs`: cover table, role, phase, `.gitignore`, and deprecated lint validation.
- Modify `package.json`: include the new `complete-phase.mjs` script in existing test coverage indirectly through globbed tests only; no package script change is required unless syntax checks are added.

Implementation work should stay in `/Users/mak/.config/superpowers/worktrees/arc-forge/adaptive-ai-team-bootstrap`. Do not modify `/Users/mak/git/arc-forge` directly.

## Task 1: Add Failing Bootstrap Tests

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.test.mjs`

- [ ] **Step 1: Add test imports for directory and file assertions**

Update the import on line 3:

```js
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
```

This import already contains the needed helpers. No code change is needed if it still matches this line.

- [ ] **Step 2: Extend the footprint test with standards and `.gitignore` expectations**

In `apply-footprint creates the approved baseline footprint from templates`, after the durable docs loop, add:

```js
  for (const file of [
    "docs/ai-team/standards/universal.md",
    "docs/ai-team/standards/user-style.md",
    "docs/ai-team/standards/functional-programming.md",
    "docs/ai-team/standards/function-shape.md",
    "docs/ai-team/standards/react.md",
    "docs/ai-team/standards/nextjs.md",
    "docs/ai-team/standards/rust.md",
    "docs/ai-team/standards/postgres.md",
    "docs/ai-team/standards/testing.md",
    "docs/ai-team/standards/security.md",
    "docs/ai-team/standards/accessibility.md",
  ]) {
    assert.equal(existsSync(path.join(root, file)), true)
    assert.match(output, new RegExp(`Created ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
  }

  const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8")
  assert.match(gitignore, /^\.env$/m)
  assert.match(gitignore, /^\.env\.\*$/m)
  assert.match(gitignore, /^!\.env\.example$/m)
  assert.match(gitignore, /^node_modules\/$/m)
  assert.match(gitignore, /^\.next\/$/m)
```

- [ ] **Step 3: Add a test for existing `.gitignore` preservation**

Append this test:

```js
test("apply-footprint preserves an existing gitignore", () => {
  const root = tempProject()
  const original = "custom-cache/\n"
  writeFileSync(path.join(root, ".gitignore"), original)

  const output = execFileSync(process.execPath, [cli, "--project", root, "--apply-footprint"], { encoding: "utf8" })

  assert.equal(readFileSync(path.join(root, ".gitignore"), "utf8"), original)
  assert.match(output, /Skipped existing \.gitignore/)
})
```

- [ ] **Step 4: Run the targeted test and verify failure**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.test.mjs
```

Expected: fails because standards templates and `.gitignore` creation are not implemented yet.

## Task 2: Implement Bootstrap Standards and `.gitignore`

**Files:**
- Create: `skills/engineering/adaptive-ai-team-bootstrap/templates/standards/*.md`
- Create: `skills/engineering/adaptive-ai-team-bootstrap/templates/gitignore/node.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.mjs`

- [ ] **Step 1: Create standards templates**

Create these files with the listed content shape. Each file must be plain Markdown and user-editable after generation.

`templates/standards/universal.md`:

```markdown
# Universal Engineering Standard

## Purpose

Use this card for every substantial task.

## Rules

- Prefer the smallest correct change.
- Preserve existing project conventions unless the user approves a change.
- Run verification before completion claims.
- Record durable decisions in `docs/ai-team/Memory.md` when they affect future work.

## Review Questions

- Did the implementation change only the intended behavior?
- Is verification evidence present in the review or phase artifact?
- Were risks and waivers recorded?
```

`templates/standards/user-style.md`:

```markdown
# User Style Standard

## Purpose

Capture project owner preferences for code shape, design taste, naming, strictness, and communication.

## Current Preferences

- Prefer direct, factual engineering communication.
- Prefer minimal implementations over broad rewrites.
- Preserve established project patterns.

## Review Questions

- Did the work respect owner preferences already recorded in memory or instructions?
- Did the agent ask before changing workflow, style, or architecture conventions?
```

Create the remaining standards with the same sections: `Purpose`, `Rules`, `Review Questions`. Include concrete rules:

```markdown
# Functional Programming Standard

## Purpose

Use when changing functional domain logic or data transformations.

## Rules

- Prefer explicit inputs and return values over hidden mutation.
- Keep transformations readable before making them clever.
- Avoid abstraction until two real call sites need it.

## Review Questions

- Can the function behavior be tested without global state?
- Are data transformations named in the project's domain language?
```

```markdown
# Function Shape Standard

## Purpose

Use when creating or reshaping functions.

## Rules

- Make each function do one clear thing.
- Prefer one argument object when multiple values travel together.
- Keep function bodies short enough to review in one screen when feasible.

## Review Questions

- Does the function name describe the single outcome?
- Are unrelated responsibilities split?
```

```markdown
# React Standard

## Purpose

Use when changing React components, hooks, or client-side UI state.

## Rules

- Preserve the project's rendering model and component conventions.
- Avoid memoization unless measurement or existing patterns justify it.
- Keep state close to the interaction that owns it.

## Review Questions

- Does the component behave correctly on desktop and mobile?
- Are loading, empty, and error states handled where relevant?
```

```markdown
# Next.js Standard

## Purpose

Use when changing Next.js routing, rendering, configuration, or build behavior.

## Rules

- Use non-interactive verification commands.
- Prefer framework-supported routing and data-loading patterns already used by the project.
- Treat deprecated interactive commands as blockers in automation.

## Review Questions

- Does `package.json` avoid deprecated `next lint` scripts?
- Did build or typecheck run after framework-level changes?
```

```markdown
# Rust Standard

## Purpose

Use when changing Rust code, crates, or command-line tools.

## Rules

- Prefer explicit error types or context-rich errors.
- Keep ownership and lifetime choices simple before optimizing.
- Run formatting, linting, and tests when Rust files change.

## Review Questions

- Are panics limited to impossible states or tests?
- Is error context useful to callers?
```

```markdown
# PostgreSQL Standard

## Purpose

Use when changing PostgreSQL schemas, SQL, migrations, or data access.

## Rules

- Make migrations reversible or document why they are one-way.
- Add indexes only for proven query paths.
- Treat destructive data changes as high risk.

## Review Questions

- Is the migration order safe for deployed data?
- Are constraints aligned with domain rules?
```

```markdown
# Testing Standard

## Purpose

Use when adding features, fixing bugs, or changing behavior.

## Rules

- Prefer tests that fail for the intended reason before implementation.
- Test user-visible behavior and important domain rules.
- Keep brittle implementation assertions out of high-level tests.

## Review Questions

- Would the test fail if the bug returned?
- Is there verification evidence for commands that were run?
```

```markdown
# Security Standard

## Purpose

Use when changing authentication, authorization, secrets, logging, storage, networking, or dependencies.

## Rules

- Never copy secrets into docs, memory, logs, or task files.
- Treat auth and data exposure changes as high risk.
- Prefer deny-by-default access rules.

## Review Questions

- Could logs, screenshots, or artifacts expose secrets?
- Are authorization checks enforced server-side where needed?
```

```markdown
# Accessibility Standard

## Purpose

Use when changing UI, forms, navigation, color, content structure, or interactive components.

## Rules

- Preserve keyboard access for interactive controls.
- Use semantic elements before custom roles.
- Keep visible labels, focus states, and contrast reviewable.

## Review Questions

- Can the flow be completed with a keyboard?
- Are names, roles, and states exposed to assistive technology?
```

- [ ] **Step 2: Create the Node `.gitignore` template**

Create `templates/gitignore/node.md`:

```gitignore
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
*.log
.DS_Store
```

- [ ] **Step 3: Update `createFootprint` to copy standards**

In `init-ai-team.mjs`, add these entries to `templateFiles` after `specialist-teams.md`:

```js
    ["templates/standards/universal.md", "docs/ai-team/standards/universal.md"],
    ["templates/standards/user-style.md", "docs/ai-team/standards/user-style.md"],
    ["templates/standards/functional-programming.md", "docs/ai-team/standards/functional-programming.md"],
    ["templates/standards/function-shape.md", "docs/ai-team/standards/function-shape.md"],
    ["templates/standards/react.md", "docs/ai-team/standards/react.md"],
    ["templates/standards/nextjs.md", "docs/ai-team/standards/nextjs.md"],
    ["templates/standards/rust.md", "docs/ai-team/standards/rust.md"],
    ["templates/standards/postgres.md", "docs/ai-team/standards/postgres.md"],
    ["templates/standards/testing.md", "docs/ai-team/standards/testing.md"],
    ["templates/standards/security.md", "docs/ai-team/standards/security.md"],
    ["templates/standards/accessibility.md", "docs/ai-team/standards/accessibility.md"],
```

- [ ] **Step 4: Update `createFootprint` to create `.gitignore` only when safe**

After the template copy loop in `createFootprint`, add:

```js
  const gitignorePath = path.join(projectPath, ".gitignore")
  if (fileExists(gitignorePath)) {
    console.log("Skipped existing .gitignore")
  } else {
    const gitignore = await readText(path.join(skillDir, "templates/gitignore/node.md"))
    await writeNewFile(gitignorePath, gitignore)
    console.log("Created .gitignore")
  }
```

- [ ] **Step 5: Run the bootstrap tests**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.test.mjs
```

Expected: all tests in the file pass.

## Task 3: Add Failing Runtime Script Tests

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/proposal-scripts.test.mjs`

- [ ] **Step 1: Extend the `new-task` test sections**

In the `new-task writes a dated task template` test, add these expected sections to the existing section array:

```js
    "Active Standards",
    "Phase Gate",
```

- [ ] **Step 2: Add a `new-task --phase --standards` test**

Append:

```js
test("new-task records phase metadata and active standards", async () => {
  const root = tempProject("ai-team-task-phase-")
  const cli = path.join(scriptDir, "new-task.mjs")

  const result = spawnSync(process.execPath, [
    cli,
    "--project",
    root,
    "--title",
    "Auth Foundation",
    "--phase",
    "phase-2-auth",
    "--standards",
    "universal,security,nextjs",
  ], { encoding: "utf8" })

  assert.equal(result.status, 0)
  const filePath = await writtenFile(root, "tasks")
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /- Phase: phase-2-auth/)
  assert.match(content, /- universal/)
  assert.match(content, /- security/)
  assert.match(content, /- nextjs/)
  assert.match(content, /## Phase Gate/)
  assert.match(content, /- Required review artifact:/)
})
```

- [ ] **Step 3: Add `complete-phase` success and failure tests**

Append:

```js
test("complete-phase refuses successful phase completion without waiver when verification failed", () => {
  const root = tempProject("ai-team-phase-fail-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(process.execPath, [
    cli,
    "--project",
    root,
    "--phase",
    "phase-2-auth",
    "--review",
    ".ai-team/reviews/phase-2-auth-review.md",
    "--verification",
    "npm run build failed",
    "--memory",
    "updated",
    "--next",
    "phase-3-ui",
    "--status",
    "success",
  ], { encoding: "utf8" })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cannot mark phase successful when verification failed without --waived-by/)
})

test("complete-phase writes a phase completion artifact with waiver evidence", async () => {
  const root = tempProject("ai-team-phase-write-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(process.execPath, [
    cli,
    "--project",
    root,
    "--phase",
    "phase-2-auth",
    "--review",
    ".ai-team/reviews/phase-2-auth-review.md",
    "--verification",
    "npm run build failed: missing env in local sandbox",
    "--memory",
    "updated",
    "--next",
    "phase-3-ui",
    "--status",
    "success",
    "--waived-by",
    "Mak",
  ], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/logs\/\d{4}-\d{2}-\d{2}-phase-2-auth-completion\.md/)
  const filePath = await writtenFile(root, "logs")
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /^# Phase Completion: phase-2-auth/)
  assert.match(content, /- Review artifact: \.ai-team\/reviews\/phase-2-auth-review\.md/)
  assert.match(content, /- Verification: npm run build failed: missing env in local sandbox/)
  assert.match(content, /- Waived by: Mak/)
})
```

- [ ] **Step 4: Run targeted tests and verify failure**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/proposal-scripts.test.mjs
```

Expected: fails because `new-task` lacks phase/standards output and `complete-phase.mjs` does not exist.

## Task 4: Implement Runtime Scripts

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs`
- Create: `skills/engineering/adaptive-ai-team-bootstrap/scripts/complete-phase.mjs`

- [ ] **Step 1: Add phase and standards parsing to `new-task.mjs`**

After the `title` constant, add:

```js
const phase = typeof args.phase === "string" && args.phase.trim() !== "" ? args.phase.trim() : "not a phase task"
const standards = typeof args.standards === "string" && args.standards.trim() !== ""
  ? args.standards.split(",").map((item) => item.trim()).filter(Boolean)
  : ["universal", "user-style", "testing"]
```

- [ ] **Step 2: Pass phase and standards to `renderTask`**

Change:

```js
const task = renderTask(title)
```

to:

```js
const task = renderTask(title, phase, standards)
```

Change the function signature:

```js
function renderTask(taskTitle, taskPhase, activeStandards) {
```

- [ ] **Step 3: Update the task template output**

Inside `renderTask`, after `Date: ${today()}`, add:

```md
Phase: ${taskPhase}
```

After the `## Context` section, add:

```js
## Active Standards

${activeStandards.map((standard) => `- ${standard}`).join("\n")}

## Phase Gate

- Phase: ${taskPhase}
- Required task artifact: this file
- Required review artifact:
- Required verification log:
- Memory update decision: updated, not needed, or blocked
- Next phase approval needed:
```

- [ ] **Step 4: Create `complete-phase.mjs`**

Create the file:

```js
#!/usr/bin/env node
import path from "node:path"
import { parseArgs, projectRoot, relative, slugify, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const root = projectRoot(args)
const phase = requiredString("phase")
const review = requiredString("review")
const verification = requiredString("verification")
const memory = requiredString("memory")
const next = requiredString("next")
const status = typeof args.status === "string" && args.status.trim() !== "" ? args.status.trim() : "blocked"
const waivedBy = typeof args["waived-by"] === "string" ? args["waived-by"].trim() : ""

if (status === "success" && /\b(fail|failed|failing|error|errored)\b/i.test(verification) && waivedBy === "") {
  console.error("Cannot mark phase successful when verification failed without --waived-by")
  process.exit(1)
}

const filePath = path.join(root, ".ai-team", "logs", `${today()}-${slugify(phase)}-completion.md`)
const content = `# Phase Completion: ${phase}

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}

## Verdict

- Status: ${status}
- Waived by: ${waivedBy || "none"}

## Required Evidence

- Review artifact: ${review}
- Verification: ${verification}
- Memory update decision: ${memory}
- Next phase recommendation: ${next}

## Blockers And Risks

- Record unresolved blockers before approving the next phase.
`

await writeNewFile(filePath, content)
console.log(`Wrote ${relative(root, filePath)}`)

function requiredString(name) {
  if (typeof args[name] !== "string" || args[name].trim() === "") {
    console.error(`--${name} must be followed by a non-empty value`)
    process.exit(1)
  }
  return args[name].trim()
}
```

- [ ] **Step 5: Run runtime script tests**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/proposal-scripts.test.mjs
```

Expected: all tests in the file pass.

## Task 5: Add Failing Validator Tests

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.test.mjs`

- [ ] **Step 1: Add test imports**

Change line 3 from:

```js
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
```

to:

```js
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
```

No import change is required; this step records that existing imports are sufficient.

- [ ] **Step 2: Add `.gitignore` validation test**

Append:

```js
test("reports missing gitignore when package.json exists", () => {
  const root = tempProject()
  writeFileSync(path.join(root, "package.json"), "{}\n")
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /missing: \.gitignore/)
})
```

- [ ] **Step 3: Add markdown table mismatch test**

Append:

```js
test("reports markdown table column mismatches", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "docs/ai-team/team.md"), "# Team\n\n| Role | Owner |\n| --- |\n| Reviewer | Agent |\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /markdown table column mismatch in docs\/ai-team\/team\.md/)
})
```

- [ ] **Step 4: Add role decision-rights mismatch test**

Append:

```js
test("reports roles present in team but absent from decision rights", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "docs/ai-team/team.md"), "# Team\n\n| Role | Mission |\n| --- | --- |\n| Product Manager | Shape product decisions |\n")
  writeFileSync(path.join(root, "docs/ai-team/decision-rights.md"), "# Decision Rights\n\n| Role | Authority |\n| --- | --- |\n| Reviewer | Blocks quality regressions |\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /role in team.md missing from decision-rights.md: Product Manager/)
})
```

- [ ] **Step 5: Add phase completion evidence test**

Append:

```js
test("reports successful phase completion without review or verification evidence", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "logs", "phase.md"), "# Phase Completion: phase-2\n\n- Status: success\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /phase completion missing review artifact evidence/)
  assert.match(result.stdout, /phase completion missing verification evidence/)
})
```

- [ ] **Step 6: Add deprecated Next lint test**

Append:

```js
test("reports deprecated interactive next lint scripts", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { lint: "next lint" } }, null, 2))
  writeFileSync(path.join(root, ".gitignore"), "node_modules/\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /deprecated or interactive verification command in package.json: next lint/)
})
```

- [ ] **Step 7: Run validator tests and verify failure**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.test.mjs
```

Expected: fails because the new validator rules are not implemented yet.

## Task 6: Implement Validator Rules

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/shared.mjs`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs`

- [ ] **Step 1: Add table parsing helpers to `shared.mjs`**

Append:

```js
export function markdownTableColumnIssues(text) {
  const issues = []
  const lines = text.split("\n")
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index]
    const separator = lines[index + 1]
    if (!header.trim().startsWith("|") || !separator.trim().startsWith("|") || !separator.includes("---")) continue
    const headerCount = tableCellCount(header)
    const separatorCount = tableCellCount(separator)
    if (headerCount !== separatorCount) {
      issues.push({ line: index + 1, headerCount, separatorCount })
    }
  }
  return issues
}

export function tableCellCount(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").length
}

export function markdownTableFirstColumnValues(text) {
  const values = []
  const lines = text.split("\n")
  for (let index = 0; index < lines.length - 2; index += 1) {
    const header = lines[index]
    const separator = lines[index + 1]
    if (!header.trim().startsWith("|") || !separator.trim().startsWith("|") || !separator.includes("---")) continue
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = lines[rowIndex]
      if (!row.trim().startsWith("|")) break
      const first = row.trim().replace(/^\|/, "").split("|")[0].trim()
      if (first !== "") values.push(first)
    }
  }
  return values
}
```

- [ ] **Step 2: Import helpers in `check-ai-team.mjs`**

Change the import to:

```js
import path from "node:path"
import {
  fileExists,
  listFiles,
  markdownTableColumnIssues,
  markdownTableFirstColumnValues,
  parseArgs,
  projectRoot,
  readText,
  relative,
} from "./shared.mjs"
```

- [ ] **Step 3: Call the new checks**

After `await checkSecrets()`, add:

```js
await checkGitignore()
await checkMarkdownTables()
await checkRoleDecisionRights()
await checkPhaseCompletionEvidence()
await checkPackageScripts()
```

- [ ] **Step 4: Implement `.gitignore` check**

Append:

```js
async function checkGitignore() {
  const packageJsonPath = path.join(root, "package.json")
  if (fileExists(packageJsonPath) && !fileExists(path.join(root, ".gitignore"))) {
    issues.push("missing: .gitignore")
  }
}
```

- [ ] **Step 5: Implement markdown table check**

Append:

```js
async function checkMarkdownTables() {
  const allFiles = await listFiles(root)
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (!rel.startsWith("docs/ai-team/") || !rel.endsWith(".md")) continue
    const text = await readText(file)
    if (markdownTableColumnIssues(text).length > 0) {
      issues.push(`markdown table column mismatch in ${rel}`)
    }
  }
}
```

- [ ] **Step 6: Implement role decision-rights check**

Append:

```js
async function checkRoleDecisionRights() {
  const teamPath = path.join(root, "docs/ai-team/team.md")
  const rightsPath = path.join(root, "docs/ai-team/decision-rights.md")
  if (!fileExists(teamPath) || !fileExists(rightsPath)) return
  const teamRoles = markdownTableFirstColumnValues(await readText(teamPath)).filter((role) => !/^role$/i.test(role))
  const rightsText = await readText(rightsPath)
  for (const role of teamRoles) {
    if (!rightsText.includes(role)) {
      issues.push(`role in team.md missing from decision-rights.md: ${role}`)
    }
  }
}
```

- [ ] **Step 7: Implement phase completion evidence check**

Append:

```js
async function checkPhaseCompletionEvidence() {
  const allFiles = await listFiles(root)
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (!rel.startsWith(".ai-team/logs/") || !rel.endsWith(".md")) continue
    const text = await readText(file)
    if (!/^# Phase Completion:/m.test(text)) continue
    if (/- Status:\s*success/i.test(text) && !/- Review artifact:\s*\S+/i.test(text)) {
      issues.push("phase completion missing review artifact evidence")
    }
    if (/- Status:\s*success/i.test(text) && !/- Verification:\s*\S+/i.test(text)) {
      issues.push("phase completion missing verification evidence")
    }
  }
}
```

- [ ] **Step 8: Implement deprecated package script check**

Append:

```js
async function checkPackageScripts() {
  const packageJsonPath = path.join(root, "package.json")
  if (!fileExists(packageJsonPath)) return
  const text = await readText(packageJsonPath)
  let packageJson
  try {
    packageJson = JSON.parse(text)
  } catch {
    return
  }
  for (const command of Object.values(packageJson.scripts || {})) {
    if (command === "next lint" || /(^|&&|\|\|)\s*next lint(\s|$)/.test(command)) {
      issues.push("deprecated or interactive verification command in package.json: next lint")
    }
  }
}
```

- [ ] **Step 9: Run validator tests**

Run:

```sh
node --test skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.test.mjs
```

Expected: all tests in the file pass.

## Task 7: Update Templates and Role Routing Guidance

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/SKILL.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/references/operating-model.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/references/governance.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/references/project-induction.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/AGENTS.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/workflow.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/governance.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/team.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/decision-rights.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/task-brief.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/review-report.md`
- Create: role templates listed in File Structure
- Create: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/phase-completion.md`
- Create: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/verification-log.md`

- [ ] **Step 1: Update `SKILL.md` helper script block**

Add this command after `new-task.mjs`:

```sh
node skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs --project . --title "Auth Foundation" --phase "phase-2-auth" --standards "universal,security,nextjs"
node skills/engineering/adaptive-ai-team-bootstrap/scripts/complete-phase.mjs --project . --phase "phase-2-auth" --review ".ai-team/reviews/phase-2-auth-review.md" --verification "npm run build passed" --memory "updated" --next "phase-3-ui" --status "success"
```

- [ ] **Step 2: Add `SKILL.md` phase-gate rules**

After `## Safety Rules`, add:

```markdown
## Blocking Phase Gates

Substantial phases require a task brief, review report, verification evidence, memory update decision, unresolved-risk summary, and explicit next-phase approval unless the user has approved autonomous phase progression.

If build, typecheck, validator, or required review fails, the phase is blocked. Do not proceed to the next substantial phase until the blocker is fixed or explicitly waived by the user.

## Role Routing

Before dispatching subagents, select the relevant role card or specialist card. Include the selected role brief in the subagent prompt. If the runtime only supports generic subagents, specialize the prompt. If no subagents are available, simulate the role sequentially and write the role output into `.ai-team/reviews/` or `.ai-team/tasks/`.

## Active Standards

Tasks must list active standards in the task brief. Load standards by task context, not globally. Review reports must include a standards review before completion claims.
```

- [ ] **Step 3: Update generated `workflow.md`**

Add this section:

```markdown
## Blocking Phase Gate

Before moving to the next substantial phase, produce:

- `.ai-team/tasks/<phase-slug>.md`
- `.ai-team/reviews/<phase-slug>-review.md`
- verification evidence in the review or `.ai-team/logs/`
- memory update decision
- unresolved-risk summary
- next-phase approval request

Failed verification blocks phase progression unless the user explicitly waives the blocker.
```

- [ ] **Step 4: Update generated `team.md` and `decision-rights.md`**

Ensure `team.md` contains a Markdown table with first-column roles including:

```markdown
| Role | Mission | Activation |
| --- | --- | --- |
| Product Manager | Shape product decisions and user-facing scope | Product direction, prioritization, UX tradeoffs |
| Product Lead | Keep work aligned to project goals | Planning and scope decisions |
| Staff Engineer | Protect architecture and technical direction | Architecture and risk decisions |
| Implementer | Make focused code and docs changes | Approved implementation tasks |
| Reviewer | Find defects, regressions, and missing evidence | Before completion claims |
| QA/Verification | Run and interpret verification | Before phase completion |
| Docs/Memory Steward | Preserve durable decisions and terminology | Memory or docs updates |
```

Ensure `decision-rights.md` includes the same role names in its authority table.

- [ ] **Step 5: Update runtime templates**

Ensure `templates/runtime/task-brief.md` includes:

```markdown
## Active Standards

- universal
- user-style
- testing

## Phase Gate

- Phase:
- Required task artifact:
- Required review artifact:
- Required verification log:
- Memory update decision:
- Next phase approval needed:
```

Ensure `templates/runtime/review-report.md` includes:

```markdown
## Standards Review

- Active standards checked:
- Deviations:
- Waivers:

## Verification Evidence

- Commands run:
- Result:
- Output summary:

## Blocking Verdict

- Verdict: pass, blocked, or waived
- Blockers:
- Waived by:

## Next Phase Approval

- Recommended next phase:
- Approval needed:
```

- [ ] **Step 6: Create role-card templates**

For each new role file, use this exact structure with role-specific content:

```markdown
# Product Manager

## Mission

Shape product goals, user outcomes, scope cuts, and prioritization.

## Activation Triggers

- New product concept
- Feature prioritization
- Ambiguous user-facing behavior

## Inputs

- User goals
- Existing product docs
- Research, analytics, or market constraints

## Outputs

- Product brief
- Scope recommendation
- Open questions and risks

## Authority

- May recommend scope and priority.
- Must not override explicit user direction.

## Review Duties

- Check that implementation matches user outcome and product constraints.
```

Use the same headings for the other files, replacing mission, triggers, outputs, and review duties with the role names from the v2 spec.

- [ ] **Step 7: Create phase and verification runtime templates**

Create `templates/runtime/phase-completion.md`:

```markdown
# Phase Completion: <phase-slug>

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date:

## Verdict

- Status: success, blocked, or waived
- Waived by:

## Required Evidence

- Review artifact:
- Verification:
- Memory update decision:
- Next phase recommendation:

## Blockers And Risks

-
```

Create `templates/runtime/verification-log.md`:

```markdown
# Verification Log: <task-or-phase>

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date:

## Commands

| Command | Status | Output Summary |
| --- | --- | --- |

## Manual Checks

| Check | Status | Evidence |
| --- | --- | --- |

## Verdict

- Result: pass, blocked, or waived
- Waived by:
```

- [ ] **Step 8: Run skill discovery**

Run:

```sh
npm run check:skills
```

Expected: output includes `adaptive-ai-team-bootstrap` and no parse errors.

## Task 7a: Add Review Loop Control

**Files:**
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/SKILL.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/references/operating-model.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/references/governance.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/AGENTS.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/workflow.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/docs-ai-team/governance.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/review-report.md`
- Modify: `skills/engineering/adaptive-ai-team-bootstrap/templates/runtime/phase-completion.md`

- [ ] **Step 1: Add the stop rule**

Record this rule in the skill and generated docs:

```markdown
After two review-fix cycles on the same phase, continue only for Critical or High findings. Convert Medium and Low findings into follow-up work unless the user explicitly asks to keep hardening.
```

- [ ] **Step 2: Add severity definitions**

Use these definitions consistently:

```markdown
- Critical: data loss, secret exposure, security bypass, project-state corruption, or unsafe rollback.
- High: broken build/test, clear requirement miss, phase-goal validator bypass, or failed required verification.
- Medium: edge-case hardening, diagnostics, false positive/negative outside the primary path, maintainability issue, or non-blocking UX/code quality risk.
- Low: wording, style, polish, optional refactor, or documentation clarity.
```

- [ ] **Step 3: Add runtime recording fields**

Review and phase-completion templates must record review cycle count, remaining Critical/High findings, Medium/Low follow-ups, follow-up location, and whether the user requested continued hardening.

- [ ] **Step 4: Run skill discovery**

Run:

```sh
npm run check:skills
```

Expected: output includes `adaptive-ai-team-bootstrap` and no parse errors.

## Task 8: Full Verification

**Files:**
- No edits expected.

- [ ] **Step 1: Run all tests**

Run:

```sh
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run skill discovery**

Run:

```sh
npm run check:skills
```

Expected: output includes `adaptive-ai-team-bootstrap`.

- [ ] **Step 3: Run script syntax checks**

Run:

```sh
node --check skills/engineering/adaptive-ai-team-bootstrap/scripts/init-ai-team.mjs
node --check skills/engineering/adaptive-ai-team-bootstrap/scripts/check-ai-team.mjs
node --check skills/engineering/adaptive-ai-team-bootstrap/scripts/new-task.mjs
node --check skills/engineering/adaptive-ai-team-bootstrap/scripts/complete-phase.mjs
```

Expected: each command exits 0 with no syntax error output.

- [ ] **Step 4: Review git diff without committing**

Run:

```sh
git diff -- skills/engineering/adaptive-ai-team-bootstrap docs/superpowers/specs/2026-07-23-adaptive-ai-team-bootstrap-v2-enforcement-design.md docs/superpowers/plans/2026-07-23-adaptive-ai-team-bootstrap-v2-enforcement.md package.json README.md
```

Expected: diff only contains adaptive AI team bootstrap work and the approved v2 spec/plan. Do not commit unless the user explicitly requests a commit.

## Self-Review Notes

- Spec coverage: phase gates are covered by Tasks 3, 4, 7, and 8; runtime traces by Tasks 3, 4, and 7; role routing by Task 7; standards cards by Tasks 1, 2, and 7; `.gitignore` hygiene by Tasks 1, 2, 5, and 6; validator improvements by Tasks 5 and 6.
- Template blanks: runtime templates intentionally contain blank fields for generated-project users to fill during real tasks. Implementation instructions avoid undefined code symbols.
- Type consistency: scripts use existing `parseArgs`, `projectRoot`, `relative`, `slugify`, `today`, and `writeNewFile` helpers. New shared helpers are imported by name in `check-ai-team.mjs`.
- Commit handling: this plan omits commit steps because repository operations require explicit user instruction in this environment.
