#!/usr/bin/env node
import path from "node:path"
import { parseArgs, projectRoot, relative, slugify, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const dryRun = args["dry-run"] === true || args["dry-run"] === "true" || args.dry === true || args.dry === "true"
const root = projectRoot(args)
const title = typeof args.title === "string" && args.title.trim() !== "" ? args.title : "Untitled Task"
const taskPhase = typeof args.phase === "string" && args.phase.trim() !== "" ? args.phase : "not a phase task"
const standards = parseStandards(args.standards)
const taskPath = path.join(root, ".ai-team", "tasks", `${today()}-${slugify(title)}.md`)
const task = renderTask(title, taskPhase, standards)

if (dryRun) {
  console.log(task)
  console.log("\nDry run only. No files were written.")
  process.exit(0)
}

await writeNewFile(taskPath, task)
console.log(`Wrote ${relative(root, taskPath)}`)

function parseStandards(value) {
  const raw = typeof value === "string" && value.trim() !== "" ? value : "universal,user-style,testing"
  return raw
    .split(",")
    .map((standard) => standard.trim())
    .filter(Boolean)
}

function renderTask(taskTitle, taskPhase, activeStandards) {
  const standardsList = activeStandards.map((standard) => `- ${standard}`).join("\n")
  return `# ${taskTitle}

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}
Phase: ${taskPhase}

## Goal

- Describe the outcome this task should achieve.

## Scope

- In scope:
- Out of scope:

## Roles

- DRI:
- Supporting roles:
- Reviewer:

## Risk Class

- Low, medium, or high:
- Approval needed:

## Context

- Relevant constitution sections:
- Relevant memory entries:
- Relevant files:

## Active Standards

${standardsList}

## Verification Plan

- Commands:
- Manual checks:
- Evidence expected:

## Phase Gate

- Phase: ${taskPhase}
- Required task artifact: this file
- Required review artifact:
- Required verification log:
- Memory update decision: updated, not needed, or blocked
- Next phase approval needed:

## Done Definition

- Required outcome:
- Required evidence:
`
}
