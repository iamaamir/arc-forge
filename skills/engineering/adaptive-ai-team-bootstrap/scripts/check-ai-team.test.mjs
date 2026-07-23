import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const cli = path.join(scriptDir, "check-ai-team.mjs")

function tempProject() {
  const root = mkdtempSync(path.join(tmpdir(), "ai-team-check-"))
  writeFileSync(path.join(root, "README.md"), "# Example\n")
  return root
}

function writeRequiredAiTeamFiles(root, memory) {
  mkdirSync(path.join(root, "docs/ai-team"), { recursive: true })
  writeFileSync(path.join(root, "AGENTS.md"), "# Agents\n\nTemplate-Version: adaptive-ai-team-bootstrap@0.1.0\n")
  writeFileSync(path.join(root, "docs/ai-team/constitution.md"), "# Constitution\n")
  writeFileSync(path.join(root, "docs/ai-team/Memory.md"), memory)
  writeFileSync(path.join(root, "docs/ai-team/team.md"), "# Team\n")
  writeFileSync(path.join(root, "docs/ai-team/workflow.md"), "# Workflow\n")
  writeFileSync(path.join(root, "docs/ai-team/decision-rights.md"), "# Decision Rights\n")
  writeFileSync(path.join(root, "docs/ai-team/ownership.md"), "# Ownership\n")
  writeFileSync(path.join(root, "docs/ai-team/governance.md"), "# Governance\n")
  writeFileSync(path.join(root, "docs/ai-team/specialist-teams.md"), "# Specialist Teams\n")
}

test("reports missing required AI-team files", () => {
  const root = tempProject()
  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /AI team check found issues:/)
  assert.match(result.stdout, /missing: AGENTS\.md/)
  assert.match(result.stdout, /missing: docs\/ai-team\/constitution\.md/)
})

test("reports Memory.md missing required metadata table fields", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(root, "# Memory\n\nSource and Confidence are mentioned in prose.\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(
    result.stdout,
    /Memory\.md should include table metadata fields: Source, Date, Confidence, Scope, Review Status/,
  )
})

test("reports unrelated AGENTS.md without adaptive marker", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "AGENTS.md"), "# Next.js Rules\n\nRead framework docs before editing.\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /AGENTS\.md missing adaptive-ai-team-bootstrap marker/)
})

test("passes when Memory.md includes required metadata table fields", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

test("reports Memory.md when any metadata table is missing required fields", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    [
      "# Memory",
      "",
      "| Source | Date | Confidence | Scope | Review Status | Note |",
      "| --- | --- | --- | --- | --- | --- |",
      "| agent | 2026-07-23 | high | docs | current | compliant |",
      "",
      "| Source | Date | Confidence | Note |",
      "| --- | --- | --- | --- |",
      "| agent | 2026-07-23 | high | missing fields |",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(
    result.stdout,
    /Memory\.md should include table metadata fields: Source, Date, Confidence, Scope, Review Status/,
  )
})

test("reports possible secrets in runtime task files", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "tasks"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "tasks", "task.md"), "api_key = abcdefghijklmnopqrstuvwxyz\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /possible secret in \.ai-team\/tasks\/task\.md/)
})

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

test("reports missing gitignore when git repository exists without package json", () => {
  const root = tempProject()
  mkdirSync(path.join(root, ".git"), { recursive: true })
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /missing: \.gitignore/)
})

test("reports markdown table column mismatches", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "docs/ai-team/team.md"), "# Team\n\n| Role | Owner |\n| --- |\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /markdown table column mismatch in docs\/ai-team\/team\.md/)
})

test("reports roles present in team but absent from decision rights", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(
    path.join(root, "docs/ai-team/team.md"),
    "# Team\n\n| Role | Owner |\n| --- | --- |\n| Product Manager | Alex |\n",
  )
  writeFileSync(
    path.join(root, "docs/ai-team/decision-rights.md"),
    "# Decision Rights\n\n| Role | Decision |\n| --- | --- |\n| Reviewer | Reviews changes |\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /role in team\.md missing from decision-rights\.md: Product Manager/)
})

test("require-runtime-trace reports source files without operating trace artifacts", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "app.js"), "console.log('hello')\n")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--require-runtime-trace"], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /runtime trace required because project source files exist/)
  assert.match(result.stdout, /missing runtime trace artifact in \.ai-team\/tasks\//)
  assert.match(result.stdout, /missing runtime trace artifact in \.ai-team\/reviews\//)
  assert.match(result.stdout, /missing runtime trace artifact in \.ai-team\/logs\//)
})

test("require-runtime-trace ignores installed skill source files", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".qwen", "skills", "adaptive-ai-team-bootstrap", "scripts"), { recursive: true })
  writeFileSync(path.join(root, ".qwen", "skills", "adaptive-ai-team-bootstrap", "scripts", "check-ai-team.mjs"), "console.log('skill')\n")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--require-runtime-trace"], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

test("require-runtime-trace passes when source files have task review and log artifacts", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  writeFileSync(path.join(root, "app.js"), "console.log('hello')\n")
  mkdirSync(path.join(root, ".ai-team", "tasks"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "tasks", "app.md"), "# Task\n")
  writeFileSync(path.join(root, ".ai-team", "reviews", "app.md"), "# Review\n\n- Verification evidence: node --check app.js passed\n")
  writeFileSync(path.join(root, ".ai-team", "logs", "app.md"), "# Verification Log\n\n- Result: pass\n")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--require-runtime-trace"], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

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

test("reports review artifacts without verification evidence", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "reviews", "review.md"), "# Review Report\n\n## Findings\n\n- No findings\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /review artifact missing verification evidence in \.ai-team\/reviews\/review\.md/)
})

test("reports review artifacts with blank verification evidence fields", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(
    path.join(root, ".ai-team", "reviews", "review.md"),
    "# Review Report\n\n## Verification Evidence\n\n- Commands run:\n- Result:\n- Output summary:\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /review artifact missing verification evidence in \.ai-team\/reviews\/review\.md/)
})

test("reports review artifacts with result but no command or output evidence", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(
    path.join(root, ".ai-team", "reviews", "review.md"),
    "# Review Report\n\n## Verification Evidence\n\n- Commands run:\n- Result: pass\n- Output summary:\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /review artifact missing verification evidence in \.ai-team\/reviews\/review\.md/)
})

test("accepts review artifacts with verification evidence field", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(
    path.join(root, ".ai-team", "reviews", "review.md"),
    "# Review Report\n\n## Phase Gate\n\n- Verification evidence: npm test passed\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

test("reports review artifacts with placeholder verification evidence", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "reviews", "review.md"), "# Review Report\n\n- Verification: not provided\n")

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /review artifact missing verification evidence in \.ai-team\/reviews\/review\.md/)
})

test("allows waived successful phase completion without task artifact", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "reviews", "phase.md"), "# Review\n\n- Commands run: npm test\n")
  writeFileSync(
    path.join(root, ".ai-team", "logs", "phase.md"),
    [
      "# Phase Completion: phase-2",
      "",
      "- Status: success",
      "- Waived by: Mak",
      "- Task artifact: not provided",
      "- Review artifact: .ai-team/reviews/phase.md",
      "- Verification: npm test passed",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

test("reports successful phase completion without matching task or review artifacts", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  writeFileSync(
    path.join(root, ".ai-team", "logs", "phase.md"),
    [
      "# Phase Completion: phase-2",
      "",
      "- Status: success",
      "- Task artifact: not provided",
      "- Review artifact: .ai-team/reviews/missing.md",
      "- Verification: npm test passed",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /phase completion missing task artifact evidence in \.ai-team\/logs\/phase\.md/)
  assert.match(result.stdout, /phase completion review artifact does not exist in \.ai-team\/logs\/phase\.md: \.ai-team\/reviews\/missing\.md/)
})

test("reports placeholder phase completion review and verification evidence", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "tasks"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "tasks", "phase.md"), "# Task\n")
  writeFileSync(
    path.join(root, ".ai-team", "logs", "phase.md"),
    [
      "# Phase Completion: phase-2",
      "",
      "- Status: success",
      "- Task artifact: .ai-team/tasks/phase.md",
      "- Review artifact: not provided",
      "- Verification: not provided",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /phase completion missing review artifact evidence in \.ai-team\/logs\/phase\.md/)
  assert.match(result.stdout, /phase completion missing verification evidence in \.ai-team\/logs\/phase\.md/)
})

test("reports successful phase completion when referenced verification log failed", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "tasks"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "tasks", "phase.md"), "# Task\n")
  writeFileSync(path.join(root, ".ai-team", "reviews", "phase.md"), "# Review\n\n- Verification evidence: checked log\n")
  writeFileSync(path.join(root, ".ai-team", "logs", "verification.md"), "# Verification Log\n\n- Result: failed\n")
  writeFileSync(
    path.join(root, ".ai-team", "logs", "phase.md"),
    [
      "# Phase Completion: phase-2",
      "",
      "- Status: success",
      "- Task artifact: .ai-team/tasks/phase.md",
      "- Review artifact: .ai-team/reviews/phase.md",
      "- Verification: .ai-team/logs/verification.md",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /phase completion references failed verification evidence in \.ai-team\/logs\/phase\.md: \.ai-team\/logs\/verification\.md/)
})

test("accepts successful phase completion when referenced verification log passed with zero failures", () => {
  const root = tempProject()
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )
  mkdirSync(path.join(root, ".ai-team", "logs"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "tasks"), { recursive: true })
  mkdirSync(path.join(root, ".ai-team", "reviews"), { recursive: true })
  writeFileSync(path.join(root, ".ai-team", "tasks", "phase.md"), "# Task\n")
  writeFileSync(path.join(root, ".ai-team", "reviews", "phase.md"), "# Review\n\n- Verification evidence: checked log\n")
  writeFileSync(
    path.join(root, ".ai-team", "logs", "verification.md"),
    "# Verification Log\n\n- Result: pass\n- Output summary: 56 tests, 56 pass, 0 fail\n",
  )
  writeFileSync(
    path.join(root, ".ai-team", "logs", "phase.md"),
    [
      "# Phase Completion: phase-2",
      "",
      "- Status: success",
      "- Task artifact: .ai-team/tasks/phase.md",
      "- Review artifact: .ai-team/reviews/phase.md",
      "- Verification: .ai-team/logs/verification.md",
      "",
    ].join("\n"),
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /AI team check passed/)
})

test("reports deprecated interactive next lint scripts", () => {
  const root = tempProject()
  writeFileSync(path.join(root, "package.json"), '{"scripts":{"lint":"next lint"}}\n')
  writeFileSync(path.join(root, ".gitignore"), "node_modules\n")
  writeRequiredAiTeamFiles(
    root,
    "# Memory\n\n| Source | Date | Confidence | Scope | Review Status | Note |\n| --- | --- | --- | --- | --- | --- |\n",
  )

  const result = spawnSync(process.execPath, [cli, "--project", root], { encoding: "utf8" })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /deprecated or interactive verification command in package\.json: next lint/)
})
