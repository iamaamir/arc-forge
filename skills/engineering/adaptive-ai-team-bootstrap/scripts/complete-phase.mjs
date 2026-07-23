#!/usr/bin/env node
import path from "node:path"
import { fileExists, parseArgs, projectRoot, readText, relative, slugify, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const dryRun = args["dry-run"] === true || args["dry-run"] === "true" || args.dry === true || args.dry === "true"
const root = projectRoot(args)
const phase = requiredArg("phase")
const task = optionalArg("task", "not provided")
const review = requiredArg("review")
const verification = requiredArg("verification")
const memory = requiredArg("memory")
const next = requiredArg("next")
const risks = optionalArg("risks", "none recorded")
const approval = optionalArg("approval", "request explicit approval before next substantial phase")
const status = typeof args.status === "string" && args.status.trim() !== "" ? args.status.trim().toLowerCase() : "blocked"
const waivedBy = typeof args["waived-by"] === "string" && args["waived-by"].trim() !== "" ? args["waived-by"] : ""
const reviewVerdict = typeof args["review-verdict"] === "string" && args["review-verdict"].trim() !== "" ? args["review-verdict"] : "not provided"
const verificationEvidence = await verificationText(verification)

if (status === "success" && hasFailedEvidence(verificationEvidence) && waivedBy === "") {
  console.error("Cannot mark phase successful when verification failed without --waived-by")
  process.exit(1)
}

if (status === "success" && /\b(block|blocked|blocking|request changes|failed|fail)\b/i.test(reviewVerdict) && waivedBy === "") {
  console.error("Cannot mark phase successful when review verdict is blocking without --waived-by")
  process.exit(1)
}

if (status === "success" && /^not provided$/i.test(task) && waivedBy === "") {
  console.error("Cannot mark phase successful without --task unless --waived-by is supplied")
  process.exit(1)
}

const completionPath = path.join(root, ".ai-team", "logs", `${today()}-${slugify(phase)}-completion.md`)
const completion = renderCompletion()

if (dryRun) {
  console.log(completion)
  console.log("\nDry run only. No files were written.")
  process.exit(0)
}

await writeNewFile(completionPath, completion)
console.log(`Wrote ${relative(root, completionPath)}`)

function requiredArg(name) {
  if (typeof args[name] !== "string" || args[name].trim() === "") {
    throw new Error(`--${name} is required`)
  }
  return args[name]
}

function optionalArg(name, fallback) {
  return typeof args[name] === "string" && args[name].trim() !== "" ? args[name] : fallback
}

async function verificationText(value) {
  const evidencePath = path.join(root, value)
  if (looksLikeRelativeArtifactPath(value) && fileExists(evidencePath)) {
    return `${value}\n${await readText(evidencePath)}`
  }
  return value
}

function looksLikeRelativeArtifactPath(value) {
  return value.startsWith(".ai-team/") || value.startsWith("docs/ai-team/")
}

function hasFailedEvidence(value) {
  return /\b(failed|failing|error|errored)\b/i.test(value) || /^- (Result|Status|Verification status):\s*(fail|failed|error|errored|blocked)\b/im.test(value)
}

function renderCompletion() {
  const waiverLine = waivedBy === "" ? "" : `- Waived by: ${waivedBy}\n`
  return `# Phase Completion: ${phase}

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}

- Status: ${status}
- Phase: ${phase}
- Task artifact: ${task}
- Review artifact: ${review}
- Review verdict: ${reviewVerdict}
- Verification: ${verification}
- Memory update decision: ${memory}
- Unresolved-risk summary: ${risks}
- Next phase recommendation: ${next}
- Next phase approval request: ${approval}
${waiverLine}`
}
