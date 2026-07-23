import { mkdir, readFile, readdir, lstat, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith("--")) {
      args._.push(arg)
      continue
    }
    if (arg.includes("=")) {
      const [key, ...valueParts] = arg.slice(2).split("=")
      args[key] = valueParts.join("=")
      continue
    }
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

export function projectRoot(args) {
  if (args.project !== undefined && (typeof args.project !== "string" || args.project.trim() === "")) {
    throw new Error("--project must be followed by a non-empty path")
  }
  return path.resolve(String(args.project || "."))
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

export function shouldIgnoreProjectPath(relPath) {
  const normalized = relPath.split(path.sep).join("/")
  return (
    normalized === ".git" ||
    normalized === "node_modules" ||
    normalized === ".next" ||
    normalized === ".agents" ||
    normalized === ".goose" ||
    normalized === ".pi" ||
    normalized === ".qwen" ||
    normalized === "skills-lock.json" ||
    normalized.startsWith(".git/") ||
    normalized.startsWith("node_modules/") ||
    normalized.startsWith(".next/") ||
    normalized.startsWith(".agents/") ||
    normalized.startsWith(".goose/") ||
    normalized.startsWith(".pi/") ||
    normalized.startsWith(".qwen/") ||
    normalized.startsWith(".claude/skills/")
  )
}

export function relative(root, filePath) {
  return path.relative(root, filePath)
}

export function markdownTableColumnIssues(text) {
  const issues = []
  const lines = text.split("\n")
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index]
    const separator = lines[index + 1]
    if (!header.trim().startsWith("|") || !separator.trim().startsWith("|") || !separator.includes("---")) continue
    const headerCount = tableCellCount(header)
    const separatorCount = tableCellCount(separator)
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
    const header = lines[index]
    const separator = lines[index + 1]
    if (!header.trim().startsWith("|") || !separator.trim().startsWith("|") || !separator.includes("---")) continue
    const firstHeader = header.trim().replace(/^\|/, "").split("|")[0].trim()
    if (!/^role$/i.test(firstHeader)) continue
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = lines[rowIndex]
      if (!row.trim().startsWith("|")) break
      const first = row.trim().replace(/^\|/, "").split("|")[0].trim()
      if (first !== "") values.push(first)
    }
  }
  return values
}
