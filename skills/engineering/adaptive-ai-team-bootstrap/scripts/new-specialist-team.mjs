#!/usr/bin/env node
import path from "node:path"
import { parseArgs, projectRoot, relative, slugify, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const dryRun = args["dry-run"] === true || args["dry-run"] === "true" || args.dry === true || args.dry === "true"
const root = projectRoot(args)
const team = typeof args.team === "string" && args.team.trim() !== "" ? args.team : "Specialist Team"
const proposal = renderProposal(team)
const proposalPath = path.join(root, ".ai-team", "proposals", `${today()}-${slugify(team)}-team.md`)

if (dryRun) {
  console.log(proposal)
  console.log("\nDry run only. No files were written.")
  process.exit(0)
}

await writeNewFile(proposalPath, proposal)
console.log(`Wrote ${relative(root, proposalPath)}`)

function renderProposal(teamName) {
  return `# Specialist Team Proposal: ${teamName}

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}

## Team Name

- ${teamName}

## Mission

- State the team mission and intended outcome.

## Scope

- Work this team owns:

## Non-Scope

- Work this team must not own:

## Owner

- Accountable owner:

## Owned Domains Or Files

- Paths, domains, systems, or docs owned by this team:

## Roles

- Team roles and responsibilities:

## Quality Gates

- Required checks before handoff or completion:

## Dependencies

- Other teams, roles, tools, or decisions required:

## Escalation Rules

- Conditions and paths for escalation:

## Scaling Trigger

- When this team should grow, split, or receive more authority:

## Retirement Criteria

- Conditions that make this specialist team unnecessary:
`
}
