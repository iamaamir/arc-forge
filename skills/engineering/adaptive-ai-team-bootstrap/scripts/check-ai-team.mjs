#!/usr/bin/env node
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

const args = parseArgs(process.argv.slice(2))
const root = projectRoot(args)
const required = [
  "AGENTS.md",
  "docs/ai-team/constitution.md",
  "docs/ai-team/Memory.md",
  "docs/ai-team/team.md",
  "docs/ai-team/workflow.md",
  "docs/ai-team/decision-rights.md",
  "docs/ai-team/ownership.md",
  "docs/ai-team/governance.md",
  "docs/ai-team/specialist-teams.md",
]

const issues = []
const allFiles = await listFiles(root)

for (const file of required) {
  const fullPath = path.join(root, file)
  if (!fileExists(fullPath)) {
    issues.push(`missing: ${file}`)
  }
}

await checkMemory()
await checkAgentsEntrypoint()
await checkSecrets()
await checkGitignore()
await checkMarkdownTables()
await checkRoleDecisionRights()
await checkReviewVerificationEvidence()
await checkPhaseCompletionEvidence()
await checkPackageScripts()
await checkRequiredRuntimeTrace()

if (issues.length > 0) {
  console.log("AI team check found issues:")
  for (const issue of issues) console.log(`- ${issue}`)
  process.exit(1)
}

console.log("AI team check passed")

async function checkMemory() {
  const memoryPath = path.join(root, "docs/ai-team/Memory.md")
  if (!fileExists(memoryPath)) return
  const memory = await readText(memoryPath)
  const metadataLabels = ["Source", "Date", "Confidence", "Scope", "Review Status"]
  const lines = memory.split("\n")
  const tableHeaders = lines.filter((line, index) => {
    if (!line.startsWith("|")) return false
    const nextTableLine = lines.slice(index + 1).find((candidate) => candidate.trim() !== "")
    return nextTableLine?.startsWith("|") && nextTableLine.includes("---")
  })
  const everyTableHasMetadata = tableHeaders.every((line) => metadataLabels.every((label) => line.includes(label)))
  if (tableHeaders.length === 0 || !everyTableHasMetadata) {
    issues.push("Memory.md should include table metadata fields: Source, Date, Confidence, Scope, Review Status")
  }
}

async function checkAgentsEntrypoint() {
  const agentsPath = path.join(root, "AGENTS.md")
  if (!fileExists(agentsPath)) return
  const agents = await readText(agentsPath)
  if (!agents.includes("Template-Version: adaptive-ai-team-bootstrap@0.1.0")) {
    issues.push("AGENTS.md missing adaptive-ai-team-bootstrap marker")
  }
}

async function checkSecrets() {
  const runtimeDirs = [".ai-team/tasks", ".ai-team/proposals", ".ai-team/reviews", ".ai-team/handoffs", ".ai-team/logs"]
  const files = new Set(required.map((file) => path.join(root, file)).filter(fileExists))
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (runtimeDirs.some((dir) => rel.startsWith(`${dir}/`))) files.add(file)
  }
  const secretPattern = /(api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{12,}/i
  for (const file of files) {
    const text = await readText(file)
    if (secretPattern.test(text)) {
      issues.push(`possible secret in ${relative(root, file)}`)
    }
  }
}

async function checkGitignore() {
  const packageJsonPath = path.join(root, "package.json")
  const gitPath = path.join(root, ".git")
  if ((fileExists(packageJsonPath) || fileExists(gitPath)) && !fileExists(path.join(root, ".gitignore"))) {
    issues.push("missing: .gitignore")
  }
}

async function checkMarkdownTables() {
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (!rel.startsWith("docs/ai-team/") || !rel.endsWith(".md")) continue
    const text = await readText(file)
    if (markdownTableColumnIssues(text).length > 0) {
      issues.push(`markdown table column mismatch in ${rel}`)
    }
  }
}

async function checkRoleDecisionRights() {
  const teamPath = path.join(root, "docs/ai-team/team.md")
  const rightsPath = path.join(root, "docs/ai-team/decision-rights.md")
  if (!fileExists(teamPath) || !fileExists(rightsPath)) return
  const teamRoles = markdownTableFirstColumnValues(await readText(teamPath))
  const rightsText = await readText(rightsPath)
  for (const role of teamRoles) {
    if (!rightsText.includes(role)) {
      issues.push(`role in team.md missing from decision-rights.md: ${role}`)
    }
  }
}

async function checkPhaseCompletionEvidence() {
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (!isPhaseLog(rel)) continue
    await checkPhaseCompletionFile(rel, await readText(file))
  }
}

function isPhaseLog(rel) {
  return rel.startsWith(".ai-team/logs/") && rel.endsWith(".md")
}

function isSuccessfulPhaseCompletion(text) {
  return /^# Phase Completion:/m.test(text) && /- Status:\s*success/i.test(text)
}

async function checkPhaseCompletionFile(rel, text) {
  if (!isSuccessfulPhaseCompletion(text)) return
  const hasWaiver = !isMissingArtifactValue(artifactValue(text, "Waived by"))
  await checkTaskArtifactEvidence(rel, text, hasWaiver)
  await checkReviewArtifactEvidence(rel, text)
  await checkVerificationArtifactEvidence(rel, text, hasWaiver)
  if (hasBlockingVerdictWithoutWaiver(text)) {
    issues.push(`phase completion has blocking review verdict without waiver in ${rel}`)
  }
}

async function checkTaskArtifactEvidence(rel, text, hasWaiver) {
  const taskArtifact = artifactValue(text, "Task artifact")
  if (isMissingArtifactValue(taskArtifact)) {
    if (!hasWaiver) issues.push(`phase completion missing task artifact evidence in ${rel}`)
    return
  }
  if (isAbsentRelativeArtifact(root, taskArtifact)) {
    issues.push(`phase completion task artifact does not exist in ${rel}: ${taskArtifact}`)
  }
}

async function checkReviewArtifactEvidence(rel, text) {
  const reviewArtifact = artifactValue(text, "Review artifact")
  if (isMissingArtifactValue(reviewArtifact)) {
    issues.push(`phase completion missing review artifact evidence in ${rel}`)
    return
  }
  if (isAbsentRelativeArtifact(root, reviewArtifact)) {
    issues.push(`phase completion review artifact does not exist in ${rel}: ${reviewArtifact}`)
  }
}

async function checkVerificationArtifactEvidence(rel, text, hasWaiver) {
  const verificationArtifact = artifactValue(text, "Verification")
  if (isMissingArtifactValue(verificationArtifact)) {
    issues.push(`phase completion missing verification evidence in ${rel}`)
    return
  }
  const fullPath = path.join(root, verificationArtifact)
  if (!looksLikeRelativeArtifactPath(verificationArtifact) || !fileExists(fullPath)) return
  const verificationText = await readText(fullPath)
  if (hasFailedEvidence(verificationText) && !hasWaiver) {
    issues.push(`phase completion references failed verification evidence in ${rel}: ${verificationArtifact}`)
  }
}

function isAbsentRelativeArtifact(basePath, value) {
  return looksLikeRelativeArtifactPath(value) && !fileExists(path.join(basePath, value))
}

function hasBlockingVerdictWithoutWaiver(text) {
  return /- Review verdict:\s*(block|blocked|blocking|request changes|failed|fail)/i.test(text) && !/- Waived by:\s*\S+/i.test(text)
}

async function checkReviewVerificationEvidence() {
  for (const file of allFiles) {
    const rel = relative(root, file)
    if (!isReviewLog(rel)) continue
    if (!reviewHasVerificationEvidence(await readText(file))) {
      issues.push(`review artifact missing verification evidence in ${rel}`)
    }
  }
}

function isReviewLog(rel) {
  return rel.startsWith(".ai-team/reviews/") && rel.endsWith(".md")
}

function reviewHasVerificationEvidence(text) {
  return ["Commands run", "Output summary", "Verification", "Verification evidence"].some((label) => {
    const value = artifactValue(text, label)
    return !isMissingArtifactValue(value)
  })
}

function artifactValue(text, label) {
  const match = text.match(new RegExp(`^- ${label}:[ \\t]*(.*)$`, "im"))
  return match ? match[1].trim() : ""
}

function looksLikeRelativeArtifactPath(value) {
  return value.startsWith(".ai-team/") || value.startsWith("docs/ai-team/")
}

function isMissingArtifactValue(value) {
  return value === "" || /^not provided$/i.test(value)
}

function hasFailedEvidence(value) {
  return /\b(failed|failing|error|errored)\b/i.test(value) || /^- (Result|Status|Verification status):\s*(fail|failed|error|errored|blocked)\b/im.test(value)
}

async function checkPackageScripts() {
  const packageJsonPath = path.join(root, "package.json")
  if (!fileExists(packageJsonPath)) return
  const scripts = await parsePackageScripts(packageJsonPath)
  for (const command of scripts) {
    if (isDeprecatedCommand(command)) {
      issues.push("deprecated or interactive verification command in package.json: next lint")
    }
  }
}

async function parsePackageScripts(packageJsonPath) {
  try {
    const packageJson = JSON.parse(await readText(packageJsonPath))
    return Object.values(packageJson.scripts || {})
  } catch {
    return []
  }
}

function isDeprecatedCommand(command) {
  if (typeof command !== "string") return false
  if (command === "next lint") return true
  return /(^|&&|\|\|)\s*next lint(\s|$)/.test(command)
}

async function checkRequiredRuntimeTrace() {
  if (!isEnabled(args["require-runtime-trace"])) return
  const sourceFiles = allFiles.map((file) => relative(root, file)).filter(isProjectSourceFile)
  if (sourceFiles.length === 0) return

  const requiredRuntimeDirs = [".ai-team/tasks/", ".ai-team/reviews/", ".ai-team/logs/"]
  const missingDirs = requiredRuntimeDirs.filter((dir) => !allFiles.some((file) => relative(root, file).startsWith(dir)))
  if (missingDirs.length === 0) return

  issues.push(`runtime trace required because project source files exist: ${sourceFiles.slice(0, 3).join(", ")}`)
  for (const dir of missingDirs) {
    issues.push(`missing runtime trace artifact in ${dir}`)
  }
}

function isEnabled(value) {
  return value === true || value === "true" || value === "1" || value === "yes"
}

function isProjectSourceFile(rel) {
  if (rel.startsWith(".ai-team/") || rel.startsWith("docs/ai-team/")) return false
  if (["AGENTS.md", ".gitignore", "README.md"].includes(rel)) return false
  return /\.(cjs|css|html|js|jsx|mjs|py|rs|ts|tsx|vue|svelte|go|java|kt|rb|php|cs)$/.test(rel)
}
