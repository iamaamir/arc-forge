import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { defaultConfig } from "./config.mjs";

export function listFiles(config) {
  return config.roots.flatMap((root) => listPath(path.resolve(root), config));
}

function listPath(filePath, config) {
  if (isIgnored(filePath, config)) return [];
  const stat = statSync(filePath, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isDirectory()) return readdirSync(filePath).flatMap((name) => listPath(path.join(filePath, name), config));
  return (config.extensions ?? defaultConfig.extensions).includes(path.extname(filePath)) ? [filePath] : [];
}

function isIgnored(filePath, config) {
  return (config.ignore ?? defaultConfig.ignore).some((part) => filePath.split(path.sep).includes(part));
}
