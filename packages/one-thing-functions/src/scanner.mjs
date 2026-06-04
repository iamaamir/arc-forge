import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "acorn";

export function listFiles(config) {
  return config.roots.flatMap((root) => listPath(path.resolve(root), config));
}

function listPath(filePath, config) {
  if (isIgnored(filePath, config)) return [];
  const stat = statSync(filePath, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isDirectory()) return listDirectory(filePath, config);
  if (!hasExtension(filePath, config)) return [];
  return [filePath];
}

function listDirectory(dirPath, config) {
  return readdirSync(dirPath).flatMap((name) => listPath(path.join(dirPath, name), config));
}

function hasExtension(filePath, config) {
  return config.extensions.includes(path.extname(filePath));
}

function isIgnored(filePath, config) {
  return config.ignore.some((part) => filePath.split(path.sep).includes(part));
}

export function parseFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  return { filePath, source, ast };
}

export function walk(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const entry of Object.entries(node)) walkEntry(entry, visit);
}

function walkEntry(entry, visit) {
  if (entry[0] === "parent") return;
  walkValue(entry[1], visit);
}

function walkValue(value, visit) {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit));
  if (value && typeof value.type === "string") walk(value, visit);
}
