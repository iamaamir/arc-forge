import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { SetupError } from "./errors.mjs";

export function readLineCoverage(summaryPath = "coverage/coverage-summary.json", filePath) {
  const resolved = path.resolve(summaryPath);
  if (!existsSync(resolved)) {
    throw new SetupError(
      `no coverage summary at ${summaryPath}. Generate it by running your tests under c8:\n  npx c8 --reporter=json-summary <your test command>`,
    );
  }
  const summary = JSON.parse(readFileSync(resolved, "utf8"));
  const key = findSummaryKey(summary, filePath);
  if (!key) return 0;
  return summary[key]?.lines?.pct ?? 0;
}

function findSummaryKey(summary, filePath) {
  const target = canonicalize(filePath);
  for (const key of Object.keys(summary)) {
    if (canonicalize(key) === target) return key;
  }
  return Object.keys(summary).find((key) => key.endsWith(filePath.replace(/^\.\//, "")));
}

function canonicalize(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}
