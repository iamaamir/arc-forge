#!/usr/bin/env node
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ensureDir, fileExists, listFiles, parseArgs, projectRoot, readText, relative, today, writeNewFile } from "./shared.mjs"

const args = parseArgs(process.argv.slice(2))
const dryRun = args["dry-run"] === true || args["dry-run"] === "true"
const apply = args.apply === true
const applyFootprint = args["apply-footprint"] === true

if (dryRun && apply) {
  console.error("--dry-run and --apply cannot be used together")
  process.exit(1)
}

if (applyFootprint && (dryRun || apply)) {
  console.error("--apply-footprint cannot be used with --dry-run or --apply")
  process.exit(1)
}

const root = projectRoot(args)
const skillDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const signals = await detectSignals(root)
const proposal = renderProposal(signals)
const proposalPath = path.join(root, ".ai-team", "proposals", `${today()}-induction-proposal.md`)

if (applyFootprint) {
  await createFootprint(root)
  process.exit(0)
}

if (!apply) {
  console.log(proposal)
  console.log("\nDry run only. Re-run with --apply after explicit user approval to write the proposal file.")
  process.exit(0)
}

await writeNewFile(proposalPath, proposal)
console.log(`Wrote ${relative(root, proposalPath)}`)
console.log("Review and approve this proposal before creating the full AI-team footprint.")

async function createFootprint(projectPath) {
  const templateFiles = [
    ["templates/AGENTS.md", "AGENTS.md"],
    ["templates/docs-ai-team/constitution.md", "docs/ai-team/constitution.md"],
    ["templates/docs-ai-team/Memory.md", "docs/ai-team/Memory.md"],
    ["templates/docs-ai-team/team.md", "docs/ai-team/team.md"],
    ["templates/docs-ai-team/workflow.md", "docs/ai-team/workflow.md"],
    ["templates/docs-ai-team/decision-rights.md", "docs/ai-team/decision-rights.md"],
    ["templates/docs-ai-team/ownership.md", "docs/ai-team/ownership.md"],
    ["templates/docs-ai-team/governance.md", "docs/ai-team/governance.md"],
    ["templates/docs-ai-team/specialist-teams.md", "docs/ai-team/specialist-teams.md"],
    ["templates/roles/product-manager.md", "docs/ai-team/roles/product-manager.md"],
    ["templates/roles/product-lead.md", "docs/ai-team/roles/product-lead.md"],
    ["templates/roles/staff-engineer.md", "docs/ai-team/roles/staff-engineer.md"],
    ["templates/roles/implementer.md", "docs/ai-team/roles/implementer.md"],
    ["templates/roles/reviewer.md", "docs/ai-team/roles/reviewer.md"],
    ["templates/roles/qa-verification.md", "docs/ai-team/roles/qa-verification.md"],
    ["templates/roles/docs-memory-steward.md", "docs/ai-team/roles/docs-memory-steward.md"],
    ["templates/roles/ux-ui-specialist.md", "docs/ai-team/roles/ux-ui-specialist.md"],
    ["templates/roles/frontend-engineer.md", "docs/ai-team/roles/frontend-engineer.md"],
    ["templates/roles/backend-engineer.md", "docs/ai-team/roles/backend-engineer.md"],
    ["templates/roles/security-iam-reviewer.md", "docs/ai-team/roles/security-iam-reviewer.md"],
    ["templates/roles/seo-specialist.md", "docs/ai-team/roles/seo-specialist.md"],
    ["templates/roles/collaboration-realtimes-specialist.md", "docs/ai-team/roles/collaboration-realtimes-specialist.md"],
    ["templates/roles/infra-devops-specialist.md", "docs/ai-team/roles/infra-devops-specialist.md"],
    ["templates/roles/data-analytics-specialist.md", "docs/ai-team/roles/data-analytics-specialist.md"],
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
  ]

  for (const [, target] of templateFiles) {
    const targetPath = path.join(projectPath, target)
    if (fileExists(targetPath)) {
      throw new Error(`Refusing to overwrite existing file: ${targetPath}`)
    }
  }

  for (const [source, target] of templateFiles) {
    const content = await readText(path.join(skillDir, source))
    const targetPath = path.join(projectPath, target)
    await writeNewFile(targetPath, content)
    console.log(`Created ${relative(projectPath, targetPath)}`)
  }

  const gitignorePath = path.join(projectPath, ".gitignore")
  if (fileExists(gitignorePath)) {
    console.log("Skipped existing .gitignore")
  } else {
    const gitignore = await readText(path.join(skillDir, "templates/gitignore/node.md"))
    await writeNewFile(gitignorePath, gitignore)
    console.log("Created .gitignore")
  }

  for (const dir of ["tasks", "proposals", "reviews", "handoffs", "logs"]) {
    const targetDir = path.join(projectPath, ".ai-team", dir)
    await ensureDir(targetDir)
    console.log(`Created ${relative(projectPath, targetDir)}`)
  }
}

async function detectSignals(projectPath) {
  const files = await listFiles(projectPath)
  const rel = files.map((file) => relative(projectPath, file))
  return {
    hasAgentInstructions: rel.some((file) => ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"].includes(file)),
    hasDocs: rel.some((file) => file.startsWith("docs/") || file === "README.md"),
    hasCi: rel.some((file) => file.startsWith(".github/workflows/")),
    hasPackageJson: fileExists(path.join(projectPath, "package.json")),
    hasGitignore: fileExists(path.join(projectPath, ".gitignore")),
    hasTests: rel.some((file) => /test|spec/i.test(file)),
    existingAiTeam: rel.some((file) => file.startsWith("docs/ai-team/") || file.startsWith(".ai-team/")),
    sampleFiles: rel.slice(0, 40),
    skillDir,
  }
}

function renderProposal(signals) {
  return `# Project Induction Proposal

Template-Version: adaptive-ai-team-bootstrap@0.1.0
Date: ${today()}

## Detected Project Type

- Type: inferred from repository files
- Confidence: medium until human review

## Detected Signals

${renderSignalLines(signals)}

## New-Project Hygiene

- \`.gitignore\` recommendation: ${gitignoreRecommendation(signals.hasGitignore)}
- Environment files: keep \`.env\` and \`.env.*\` ignored; commit only safe examples such as \`.env.example\`.

## Recommended Active Standards

- universal
- user-style
- testing
- Add stack standards during task briefs when relevant: security, accessibility, react, nextjs, postgres, rust, functional-programming, function-shape.

## Recommended Footprint

- Recommendation: ${footprintRecommendation(signals.existingAiTeam)}
- Root entrypoint: AGENTS.md only after conflict review
- Durable docs: docs/ai-team/
- Runtime state: .ai-team/

## Recommended Baseline Team

- Product Lead
- Staff Engineer
- Implementer
- Reviewer
- QA/Verification
- Docs/Memory Steward

## Risks And Conflicts

- Existing instruction files must be preserved and merged by proposal.
- Inferred project philosophy needs human confirmation.
- No secrets should be copied into Memory.md or runtime logs.

## Files Sampled

${signals.sampleFiles.map((file) => `- ${file}`).join("\n")}

## Approval Request

Approve the recommended footprint before creating or modifying project artifacts.
`
}

function renderSignalLines(signals) {
  return [
    ["Existing agent instructions", signals.hasAgentInstructions],
    ["Existing docs", signals.hasDocs],
    ["CI workflows", signals.hasCi],
    ["package.json", signals.hasPackageJson],
    [".gitignore", signals.hasGitignore],
    ["Test signals", signals.hasTests],
    ["Existing AI-team footprint", signals.existingAiTeam],
  ]
    .map(([label, value]) => `- ${label}: ${yesNo(value)}`)
    .join("\n")
}

function yesNo(value) {
  return value ? "yes" : "no"
}

function footprintRecommendation(existingAiTeam) {
  return existingAiTeam ? "standard update" : "standard"
}

function gitignoreRecommendation(hasGitignore) {
  if (hasGitignore) return "preserve and review existing ignore rules"
  return "create a baseline .gitignore before app scaffolding or verification writes generated files"
}
