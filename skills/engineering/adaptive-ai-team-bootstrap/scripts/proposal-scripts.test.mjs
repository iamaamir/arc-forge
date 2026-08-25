import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

function tempProject(prefix) {
  return mkdtempSync(path.join(tmpdir(), prefix))
}

function datedFile(root, dir, name) {
  return path.join(root, ".ai-team", dir, `${new Date().toISOString().slice(0, 10)}-${name}.md`)
}

function writeExistingDatedFiles(root, dir, name, content) {
  const dates = [-1, 0, 1].map((offset) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + offset)
    return date.toISOString().slice(0, 10)
  })
  for (const date of dates) {
    const filePath = path.join(root, ".ai-team", dir, `${date}-${name}.md`)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, content)
  }
  return datedFile(root, dir, name)
}

async function writtenFile(root, dir) {
  const entries = await readdir(path.join(root, ".ai-team", dir))
  assert.equal(entries.length, 1)
  return path.join(root, ".ai-team", dir, entries[0])
}

test("new-task writes a dated task template", async () => {
  const root = tempProject("ai-team-task-")
  const cli = path.join(scriptDir, "new-task.mjs")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--title", "Reduce Build Flakes"], {
    encoding: "utf8",
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/tasks\/\d{4}-\d{2}-\d{2}-reduce-build-flakes\.md/)

  const filePath = await writtenFile(root, "tasks")
  assert.match(path.basename(filePath), /^\d{4}-\d{2}-\d{2}-reduce-build-flakes\.md$/)
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /^# Reduce Build Flakes/)
  assertContentMatches(content, TASK_TEMPLATE_SECTIONS)
  assertContentMatches(content, TASK_TEMPLATE_FIELDS)
})

const TASK_TEMPLATE_SECTIONS = [
  "Template-Version",
  "Date",
  "Goal",
  "Scope",
  "Roles",
  "Risk Class",
  "Context",
  "Active Standards",
  "Verification Plan",
  "Phase Gate",
  "Done Definition",
]

const TASK_TEMPLATE_FIELDS = [
  "- Low, medium, or high:",
  "- Approval needed:",
  "- Relevant constitution sections:",
  "- Relevant memory entries:",
  "- Relevant files:",
  "- Commands:",
  "- Manual checks:",
  "- Evidence expected:",
  "- Required outcome:",
  "- Required evidence:",
]

function assertContentMatches(content, patterns) {
  for (const pattern of patterns) {
    assert.match(content, new RegExp(escapeRegExp(pattern)))
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

test("new-task records phase metadata and active standards", async () => {
  const root = tempProject("ai-team-task-metadata-")
  const cli = path.join(scriptDir, "new-task.mjs")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--title",
      "Auth Foundation",
      "--phase",
      "phase-2-auth",
      "--standards",
      "universal,security,nextjs",
    ],
    { encoding: "utf8" },
  )

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

test("complete-phase refuses successful phase completion without waiver when verification failed", () => {
  const root = tempProject("ai-team-phase-no-waiver-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--status",
      "success",
      "--verification",
      "npm run build failed",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
    ],
    { encoding: "utf8" },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cannot mark phase successful when verification failed without --waived-by/)
})

test("complete-phase treats status case-insensitively for failed verification waivers", () => {
  const root = tempProject("ai-team-phase-status-case-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--status",
      "Success",
      "--verification",
      "npm test failed",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
    ],
    { encoding: "utf8" },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cannot mark phase successful when verification failed without --waived-by/)
})

test("complete-phase refuses successful phase completion without task artifact or waiver", () => {
  const root = tempProject("ai-team-phase-no-task-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--status",
      "success",
      "--verification",
      "npm test passed",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
    ],
    { encoding: "utf8" },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cannot mark phase successful without --task unless --waived-by is supplied/)
})

test("complete-phase refuses successful phase completion when verification log path failed", () => {
  const root = tempProject("ai-team-phase-verification-log-")
  const cli = path.join(scriptDir, "complete-phase.mjs")
  const logPath = path.join(root, ".ai-team", "logs", "verification.md")
  mkdirSync(path.dirname(logPath), { recursive: true })
  writeFileSync(logPath, "# Verification Log\n\n- Result: failed\n")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--task",
      ".ai-team/tasks/phase-2-auth.md",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--status",
      "success",
      "--verification",
      ".ai-team/logs/verification.md",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
    ],
    { encoding: "utf8" },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cannot mark phase successful when verification failed without --waived-by/)
})

test("complete-phase accepts passing verification log path with zero failures", () => {
  const root = tempProject("ai-team-phase-verification-pass-")
  const cli = path.join(scriptDir, "complete-phase.mjs")
  const logPath = path.join(root, ".ai-team", "logs", "verification.md")
  mkdirSync(path.dirname(logPath), { recursive: true })
  writeFileSync(logPath, "# Verification Log\n\n- Result: pass\n- Output summary: 56 tests, 56 pass, 0 fail\n")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--task",
      ".ai-team/tasks/phase-2-auth.md",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--status",
      "success",
      "--verification",
      ".ai-team/logs/verification.md",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
    ],
    { encoding: "utf8" },
  )

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/logs\/\d{4}-\d{2}-\d{2}-phase-2-auth-completion\.md/)
})

test("complete-phase writes a phase completion artifact with waiver evidence", async () => {
  const root = tempProject("ai-team-phase-waiver-")
  const cli = path.join(scriptDir, "complete-phase.mjs")

  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--project",
      root,
      "--phase",
      "phase-2-auth",
      "--status",
      "success",
      "--review",
      ".ai-team/reviews/phase-2-auth-review.md",
      "--verification",
      "npm run build failed: missing env in local sandbox",
      "--memory",
      "updated",
      "--next",
      "phase-3-ui",
      "--waived-by",
      "Mak",
    ],
    { encoding: "utf8" },
  )

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/logs\/\d{4}-\d{2}-\d{2}-phase-2-auth-completion\.md/)

  const filePath = await writtenFile(root, "logs")
  assert.match(path.basename(filePath), /^\d{4}-\d{2}-\d{2}-phase-2-auth-completion\.md$/)
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /^# Phase Completion: phase-2-auth/)
  assert.match(content, /- Review artifact: \.ai-team\/reviews\/phase-2-auth-review\.md/)
  assert.match(content, /- Verification: npm run build failed: missing env in local sandbox/)
  assert.match(content, /- Waived by: Mak/)
})

test("new-task refuses to overwrite an existing dated task file", () => {
  const root = tempProject("ai-team-task-existing-")
  const cli = path.join(scriptDir, "new-task.mjs")
  const original = "original task content"
  const filePath = writeExistingDatedFiles(root, "tasks", "reduce-build-flakes", original)

  const result = spawnSync(process.execPath, [cli, "--project", root, "--title", "Reduce Build Flakes"], {
    encoding: "utf8",
  })

  assert.notEqual(result.status, 0)
  assert.equal(readFileSync(filePath, "utf8"), original)
})

test("new-task dry-run flags print without writing", () => {
  const cli = path.join(scriptDir, "new-task.mjs")

  for (const dryFlag of ["--dry-run", "--dry", "--dry-run=true", "--dry=true"]) {
    const root = tempProject("ai-team-task-dry-")
    const result = spawnSync(process.execPath, [cli, "--project", root, "--title", "Reduce Build Flakes", dryFlag], {
      encoding: "utf8",
    })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /^# Reduce Build Flakes/)
    assert.match(result.stdout, /Verification Plan/)
    assert.equal(existsSync(path.join(root, ".ai-team")), false)
  }
})

test("hire-agent --dry-run=true prints without writing", () => {
  const root = tempProject("ai-team-hire-dry-")
  const cli = path.join(scriptDir, "hire-agent.mjs")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--role", "Release Captain", "--dry-run=true"], {
    encoding: "utf8",
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^# Hire Agent Proposal: Release Captain/)
  assert.match(result.stdout, /Retirement Criteria/)
  assert.equal(existsSync(path.join(root, ".ai-team")), false)
})

test("hire-agent writes a dated hire proposal", async () => {
  const root = tempProject("ai-team-hire-")
  const cli = path.join(scriptDir, "hire-agent.mjs")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--role", "Release Captain"], {
    encoding: "utf8",
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/proposals\/\d{4}-\d{2}-\d{2}-hire-release-captain\.md/)

  const filePath = await writtenFile(root, "proposals")
  assert.match(path.basename(filePath), /^\d{4}-\d{2}-\d{2}-hire-release-captain\.md$/)
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /^# Hire Agent Proposal: Release Captain/)
  for (const section of [
    "Template-Version",
    "Date",
    "Role",
    "Mission",
    "Activation Triggers",
    "Inputs",
    "Outputs",
    "Authority",
    "Tools Allowed",
    "Cannot Do",
    "Verification Duties",
    "Escalation Path",
    "Retirement Criteria",
  ]) {
    assert.match(content, new RegExp(section))
  }
  assert.match(content, /## Tools Allowed\n\n- Project-approved tools only\./)
})

test("hire-agent refuses to overwrite an existing dated hire proposal", () => {
  const root = tempProject("ai-team-hire-existing-")
  const cli = path.join(scriptDir, "hire-agent.mjs")
  const original = "original hire proposal content"
  const filePath = writeExistingDatedFiles(root, "proposals", "hire-release-captain", original)

  const result = spawnSync(process.execPath, [cli, "--project", root, "--role", "Release Captain"], {
    encoding: "utf8",
  })

  assert.notEqual(result.status, 0)
  assert.equal(readFileSync(filePath, "utf8"), original)
})

test("new-specialist-team --dry=true prints without writing", () => {
  const root = tempProject("ai-team-team-dry-")
  const cli = path.join(scriptDir, "new-specialist-team.mjs")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--team", "Runtime Safety", "--dry=true"], {
    encoding: "utf8",
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^# Specialist Team Proposal: Runtime Safety/)
  assert.match(result.stdout, /Retirement Criteria/)
  assert.equal(existsSync(path.join(root, ".ai-team")), false)
})

test("new-specialist-team writes a dated specialist team proposal", async () => {
  const root = tempProject("ai-team-team-")
  const cli = path.join(scriptDir, "new-specialist-team.mjs")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--team", "Runtime Safety"], {
    encoding: "utf8",
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Wrote \.ai-team\/proposals\/\d{4}-\d{2}-\d{2}-runtime-safety-team\.md/)

  const filePath = await writtenFile(root, "proposals")
  assert.match(path.basename(filePath), /^\d{4}-\d{2}-\d{2}-runtime-safety-team\.md$/)
  const content = readFileSync(filePath, "utf8")
  assert.match(content, /^# Specialist Team Proposal: Runtime Safety/)
  for (const section of [
    "Template-Version",
    "Date",
    "Team Name",
    "Mission",
    "Scope",
    "Non-Scope",
    "Owner",
    "Owned Domains Or Files",
    "Roles",
    "Quality Gates",
    "Dependencies",
    "Escalation Rules",
    "Scaling Trigger",
    "Retirement Criteria",
  ]) {
    assert.match(content, new RegExp(section))
  }
  assert.match(content, /## Team Name\n\n- Runtime Safety/)
})

test("new-specialist-team refuses to overwrite an existing dated team proposal", () => {
  const root = tempProject("ai-team-team-existing-")
  const cli = path.join(scriptDir, "new-specialist-team.mjs")
  const original = "original team proposal content"
  const filePath = writeExistingDatedFiles(root, "proposals", "runtime-safety-team", original)

  const result = spawnSync(process.execPath, [cli, "--project", root, "--team", "Runtime Safety"], {
    encoding: "utf8",
  })

  assert.notEqual(result.status, 0)
  assert.equal(readFileSync(filePath, "utf8"), original)
})
