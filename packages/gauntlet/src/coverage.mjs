import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { SetupError } from "./errors.mjs";

export function loadCoverageSummary(summaryPath = "coverage/coverage-summary.json") {
  const resolved = path.resolve(summaryPath);
  if (!existsSync(resolved)) {
    throw new SetupError(
      `no coverage summary at ${summaryPath}. Generate it by running your tests under c8:\n  npx c8 --reporter=json-summary <your test command>`,
    );
  }
  const summary = JSON.parse(readFileSync(resolved, "utf8"));
  const keys = new Map(Object.keys(summary).map((key) => [canonicalize(key), key]));
  return (filePath) => {
    const key = keys.get(canonicalize(filePath)) ?? findSuffixKey(Object.keys(summary), filePath);
    if (!key) return 0;
    return summary[key]?.lines?.pct ?? 0;
  };
}

export function readLineCoverage(summaryPath = "coverage/coverage-summary.json", filePath) {
  return loadCoverageSummary(summaryPath)(filePath);
}

function findSuffixKey(keys, filePath) {
  const rel = filePath.replace(/^\.\//, "");
  return keys.find((key) => key.endsWith(path.sep + rel));
}

function canonicalize(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}
