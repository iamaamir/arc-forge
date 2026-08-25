import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export function listFiles(config) {
  return config.roots.flatMap((root) => listPath(path.resolve(root), config));
}

function listPath(filePath, config) {
  const stat = statSync(filePath, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isDirectory()) return readdirSync(filePath).flatMap((name) => listPath(path.join(filePath, name), config));
  return (config.extensions ?? [".js", ".mjs", ".cjs", ".jsx"]).includes(path.extname(filePath)) ? [filePath] : [];
}
