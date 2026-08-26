import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { SetupError } from "./errors.mjs";

export function loadCoverage(finalPath = "coverage/coverage-final.json") {
  const resolved = path.resolve(finalPath);
  if (!existsSync(resolved)) {
    throw new SetupError(
      `no coverage data at ${finalPath}. Generate it by running your tests under c8:\n  npx c8 --reporter=json <your test command>`,
    );
  }
  let data;
  try {
    data = JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    throw new SetupError(`invalid coverage data at ${finalPath}. Regenerate it with: npx c8 --reporter=json <your test command>`);
  }
  const keys = Object.keys(data);
  const exactKeys = new Map(keys.map((key) => [canonicalize(key), key]));
  return {
    mtimeMs: statSync(resolved).mtimeMs,
    coverageFor: (filePath, startLine, endLine) =>
      functionCoveragePct(data[findKey(exactKeys, keys, filePath)], startLine, endLine),
  };
}

function findKey(exactKeys, keys, filePath) {
  const exact = exactKeys.get(canonicalize(filePath));
  if (exact !== undefined) return exact;
  const candidates = suffixCandidates(keys, filePath);
  if (candidates.length > 1) {
    throw new SetupError(
      `ambiguous coverage keys for ${filePath} — ${candidates.length} entries end in ${path.sep}${path.basename(filePath)}: ${candidates.join(", ")}`,
    );
  }
  return candidates[0];
}

function suffixCandidates(keys, filePath) {
  const rel = path.relative(process.cwd(), canonicalize(filePath));
  if (!rel || rel.startsWith("..")) return [];
  const found = new Set();
  for (const key of keys) {
    if (key.endsWith(path.sep + rel)) found.add(key);
  }
  return [...found];
}

function functionCoveragePct(entry, startLine, endLine) {
  if (!entry?.statementMap || !entry.s) return 0;
  const inside = Object.entries(entry.statementMap).filter(
    ([, location]) => location.start.line <= endLine && location.end.line >= startLine,
  );
  if (inside.length === 0) return 100;
  const executed = inside.filter(([id]) => (entry.s[id] ?? 0) > 0).length;
  return (executed / inside.length) * 100;
}

function canonicalize(filePath) {
  const resolved = path.resolve(filePath);
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}
