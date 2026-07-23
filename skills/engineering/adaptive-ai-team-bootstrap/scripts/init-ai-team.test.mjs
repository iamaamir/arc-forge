import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const cli = path.join(scriptDir, "init-ai-team.mjs")

function tempProject() {
  const root = mkdtempSync(path.join(tmpdir(), "ai-team-init-"))
  writeFileSync(path.join(root, "README.md"), "# Example\n")
  writeFileSync(path.join(root, "package.json"), "{}\n")
  return root
}

test("dry run prints proposal and does not write files", () => {
  const root = tempProject()
  const result = spawnSync(process.execPath, [cli, "--project", root, "--dry-run"], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^# Project Induction Proposal/)
  assert.match(result.stdout, /package\.json: yes/)
  assert.match(result.stdout, /Dry run only/)
  assert.equal(existsSync(path.join(root, ".ai-team")), false)
})

test("dry run ignores installed skill directories during induction", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ai-team-init-installed-skill-"))
  const installedSkillTest = path.join(root, ".agents", "skills", "adaptive-ai-team-bootstrap", "scripts", "check-ai-team.test.mjs")
  mkdirSync(path.dirname(installedSkillTest), { recursive: true })
  writeFileSync(installedSkillTest, "// copied skill test\n")
  writeFileSync(path.join(root, "skills-lock.json"), "{}\n")

  const result = spawnSync(process.execPath, [cli, "--project", root, "--dry-run"], { encoding: "utf8" })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Test signals: no/)
  assert.doesNotMatch(result.stdout, /\.agents\/skills/)
  assert.doesNotMatch(result.stdout, /skills-lock\.json/)
})

test("dry run and apply together fail without writing proposal output", () => {
  const root = tempProject()
  const result = spawnSync(process.execPath, [cli, "--project", root, "--dry-run", "--apply"], { encoding: "utf8" })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /--dry-run and --apply cannot be used together/)
  assert.equal(existsSync(path.join(root, ".ai-team", "proposals")), false)
})

test("dry run true and apply together fail without writing proposal output", () => {
  const root = tempProject()
  const aiTeamDir = path.join(root, ".ai-team")
  const result = spawnSync(process.execPath, [cli, "--project", root, "--dry-run=true", "--apply"], { encoding: "utf8" })

  try {
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--dry-run and --apply cannot be used together/)
    assert.equal(existsSync(path.join(aiTeamDir, "proposals")), false)
  } finally {
    rmSync(aiTeamDir, { recursive: true, force: true })
  }
})

test("apply writes only a new proposal file", async () => {
  const root = tempProject()

  const output = execFileSync(process.execPath, [cli, "--project", root, "--apply"], { encoding: "utf8" })

  assert.match(output, /Wrote \.ai-team\/proposals\/\d{4}-\d{2}-\d{2}-induction-proposal\.md/)
  assert.match(output, /Review and approve this proposal/)

  const aiTeamEntries = await readdir(path.join(root, ".ai-team"))
  assert.deepEqual(aiTeamEntries, ["proposals"])

  const proposalEntries = await readdir(path.join(root, ".ai-team", "proposals"))
  assert.equal(proposalEntries.length, 1)
  assert.match(proposalEntries[0], /^\d{4}-\d{2}-\d{2}-induction-proposal\.md$/)
})

test("apply-footprint creates the approved baseline footprint from templates", async () => {
  const root = tempProject()

  const output = execFileSync(process.execPath, [cli, "--project", root, "--apply-footprint"], { encoding: "utf8" })

  for (const file of [
    "AGENTS.md",
    "docs/ai-team/constitution.md",
    "docs/ai-team/Memory.md",
    "docs/ai-team/team.md",
    "docs/ai-team/workflow.md",
    "docs/ai-team/decision-rights.md",
    "docs/ai-team/ownership.md",
    "docs/ai-team/governance.md",
    "docs/ai-team/specialist-teams.md",
  ]) {
    assert.equal(existsSync(path.join(root, file)), true)
    assert.match(output, new RegExp(`Created ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
  }

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

  for (const dir of ["tasks", "proposals", "reviews", "handoffs", "logs"]) {
    const entries = await readdir(path.join(root, ".ai-team", dir))
    assert.deepEqual(entries, [])
    assert.match(output, new RegExp(`Created \\.ai-team/${dir}`))
  }

  const template = readFileSync(path.join(scriptDir, "..", "templates", "AGENTS.md"), "utf8")
  assert.equal(readFileSync(path.join(root, "AGENTS.md"), "utf8"), template)
})

test("apply-footprint preserves an existing gitignore", () => {
  const root = tempProject()
  const original = "custom-cache/\n"
  writeFileSync(path.join(root, ".gitignore"), original)

  const output = execFileSync(process.execPath, [cli, "--project", root, "--apply-footprint"], { encoding: "utf8" })

  assert.equal(readFileSync(path.join(root, ".gitignore"), "utf8"), original)
  assert.match(output, /Skipped existing \.gitignore/)
})

test("apply-footprint refuses to overwrite existing footprint files", () => {
  const root = tempProject()
  const original = "# Existing instructions\n"
  writeFileSync(path.join(root, "AGENTS.md"), original)

  const result = spawnSync(process.execPath, [cli, "--project", root, "--apply-footprint"], { encoding: "utf8" })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Refusing to overwrite existing file:/)
  assert.equal(readFileSync(path.join(root, "AGENTS.md"), "utf8"), original)
})

test("apply-footprint preflights later footprint collisions before writing", () => {
  const root = tempProject()
  const original = "# Existing team\n"
  const laterPath = path.join(root, "docs/ai-team/team.md")
  mkdirSync(path.dirname(laterPath), { recursive: true })
  writeFileSync(laterPath, original)

  const result = spawnSync(process.execPath, [cli, "--project", root, "--apply-footprint"], { encoding: "utf8" })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Refusing to overwrite existing file:/)
  assert.equal(readFileSync(laterPath, "utf8"), original)
  assert.equal(existsSync(path.join(root, "AGENTS.md")), false)
  assert.equal(existsSync(path.join(root, "docs/ai-team/constitution.md")), false)
})

test("apply-footprint refuses dry-run and apply combinations", () => {
  const root = tempProject()

  for (const extraFlag of ["--dry-run", "--apply"]) {
    const result = spawnSync(process.execPath, [cli, "--project", root, "--apply-footprint", extraFlag], { encoding: "utf8" })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--apply-footprint cannot be used with --dry-run or --apply/)
  }
})
