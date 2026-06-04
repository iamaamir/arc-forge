import { loadConfig, mergeConfig } from "./config.mjs";
import { listFiles, parseFile } from "./scanner.mjs";
import { attachParents, checkParsedFile } from "./rules.mjs";

export function checkProject(options = {}) {
  const config = mergeConfig(options);
  return checkWithConfig(config);
}

export async function checkProjectAsync(options = {}) {
  const config = await loadConfig(options);
  return checkWithConfig(config);
}

function checkWithConfig(config) {
  return listFiles(config).flatMap((filePath) => checkFile(filePath, config));
}

function checkFile(filePath, config) {
  const parsed = parseFile(filePath);
  attachParents(parsed.ast);
  return checkParsedFile(parsed, config);
}

export function formatViolations(violations) {
  return violations.map(formatViolation).join("\n");
}

function formatViolation(violation) {
  return `${violation.filePath}:${violation.line} ${violation.name} ${violation.message}`;
}
