#!/usr/bin/env node
import path from "node:path"
import { parseArgs, projectRoot, relative, slugify, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const dryRun = args["dry-run"] === true || args["dry-run"] === "true" || args.dry === true || args.dry === "true"
const root = projectRoot(args)
const role = typeof args.role === "string" && args.role.trim() !== "" ? args.role : "New Agent"
const proposal = renderProposal(role)
const proposalPath = path.join(root, ".ai-team", "proposals", `${today()}-hire-${slugify(role)}.md`)

if (dryRun) {
  console.log(proposal)
  console.log("\nDry run only. No files were written.")
  process.exit(0)
}

await writeNewFile(proposalPath, proposal)
console.log(`Wrote ${relative(root, proposalPath)}`)

function renderProposal(agentRole) {
  return `# Hire Agent Proposal: ${agentRole}

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}

## Role

- ${agentRole}

## Mission

- State the durable mission this agent should serve.

## Activation Triggers

- When this agent should be invoked:

## Inputs

- Required context, files, and decisions:

## Outputs

- Expected deliverables:

## Authority

- Decisions this agent may make independently:

## Tools Allowed

- Project-approved tools only.

## Cannot Do

- Explicit limits, forbidden actions, or required approvals:

## Verification Duties

- Checks this agent must run or request:

## Escalation Path

- When and how this agent should escalate:

## Retirement Criteria

- Conditions that make this role unnecessary:
`
}
