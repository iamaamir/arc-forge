import { mkdir, readFile, readdir, lstat, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    i = consumeArg(argv, i, args)
  }
  return args
}

function consumeArg(argv, index, args) {
  const arg = argv[index]
  if (!arg.startsWith("--")) {
    args._.push(arg)
    return index
  }
  if (arg.includes("=")) {
    assignInlineValue(arg, args)
    return index
  }
  return consumeFlagWithOptionalValue(argv, index, args)
}

function assignInlineValue(arg, args) {
  const [key, ...valueParts] = arg.slice(2).split("=")
  args[key] = valueParts.join("=")
}

function consumeFlagWithOptionalValue(argv, index, args) {
  const key = argv[index].slice(2)
  const next = argv[index + 1]
  if (!next || next.startsWith("--")) {
    args[key] = true
    return index
  }
  args[key] = next
  return index + 1
}

export function projectRoot(args) {
  assertProjectPath(args.project)
  return path.resolve(String(args.project || "."))
}

function assertProjectPath(project) {
  if (project === undefined) return
  assertNonEmptyProjectPath(project)
}

function assertNonEmptyProjectPath(project) {
  if (typeof project === "string" && project.trim() !== "") return
  throw new Error("--project must be followed by a non-empty path")
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

export function fileExists(filePath) {
  return existsSync(filePath)
}

export async function readText(filePath) {
  return readFile(filePath, "utf8")
}

export async function writeNewFile(filePath, content) {
  if (fileExists(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`)
  }
  await ensureDir(path.dirname(filePath))
  await writeFile(filePath, content, { encoding: "utf8", flag: "wx" })
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item"
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function listFiles(root) {
  const output = []
  async function walk(dir) {
    if (!fileExists(dir)) return
    const dirInfo = await lstat(dir)
    if (dirInfo.isSymbolicLink()) return
    const entries = await readdir(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const rel = relative(root, fullPath)
      if (shouldIgnoreProjectPath(rel)) continue
      const info = await lstat(fullPath)
      if (info.isSymbolicLink()) continue
      if (info.isDirectory()) {
        await walk(fullPath)
      } else {
        output.push(fullPath)
      }
    }
  }
  await walk(root)
  return output
}

const IGNORED_PROJECT_ENTRIES = new Set([
  ".git",
  "node_modules",
  ".next",
  ".agents",
  ".goose",
  ".pi",
  ".qwen",
])

const IGNORED_PROJECT_PREFIXES = [
  ".git/",
  "node_modules/",
  ".next/",
  ".agents/",
  ".goose/",
  ".pi/",
  ".qwen/",
  ".claude/skills/",
]

export function shouldIgnoreProjectPath(relPath) {
  const normalized = relPath.split(path.sep).join("/")
  if (IGNORED_PROJECT_ENTRIES.has(normalized)) return true
  if (normalized === "skills-lock.json") return true
  return IGNORED_PROJECT_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function relative(root, filePath) {
  return path.relative(root, filePath)
}

export function markdownTableColumnIssues(text) {
  const issues = []
  const lines = text.split("\n")
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isTableHeaderPair(lines, index)) continue
    const headerCount = tableCellCount(lines[index])
    const separatorCount = tableCellCount(lines[index + 1])
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
    if (!isRoleTableHeader(lines, index)) continue
    collectTableRowValues(values, lines, index + 2)
  }
  return values
}

function isTableHeaderPair(lines, index) {
  const header = lines[index]
  const separator = lines[index + 1]
  if (!header.trim().startsWith("|")) return false
  if (!separator.trim().startsWith("|")) return false
  return separator.includes("---")
}

function isRoleTableHeader(lines, index) {
  if (!isTableHeaderPair(lines, index)) return false
  const firstHeader = firstCell(lines[index])
  return /^role$/i.test(firstHeader)
}

function collectTableRowValues(values, lines, startIndex) {
  for (let rowIndex = startIndex; rowIndex < lines.length; rowIndex += 1) {
    const row = lines[rowIndex]
    if (!row.trim().startsWith("|")) break
    const first = firstCell(row)
    if (first !== "") values.push(first)
  }
}

function firstCell(line) {
  return line.trim().replace(/^\|/, "").split("|")[0].trim()
}
