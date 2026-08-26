import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import defaultProfile from "../profiles/default.mjs";
import { SetupError } from "./errors.mjs";

export const defaultConfig = { ...defaultProfile };

const NUMERIC_KEYS = ["crapThreshold", "mutationScoreThreshold", "commandTimeoutSeconds"];

export async function loadConfigAsync(options = {}) {
  const merged = { ...defaultConfig, ...readConfigFile(), ...stripEmpty(options) };
  validateRoots(merged);
  validateNumericValues(merged);
  validateDependencyRules(merged);
  return merged;
}

function validateRoots(merged) {
  // defaultConfig always provides roots, so validation is unconditional.
  const valid = Array.isArray(merged.roots) && merged.roots.every((root) => typeof root === "string");
  if (!valid) {
    throw new SetupError('roots must be an array of directories, e.g. "roots": ["src"].');
  }
  if (merged.roots.length === 0) {
    throw new SetupError(
      'roots cannot be empty. Set "roots" to at least one directory in forge-gate.config.json, e.g. "roots": ["src"].',
    );
  }
}

function validateNumericValues(config) {
  for (const key of NUMERIC_KEYS) {
    const value = config[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new SetupError(`${key} must be a finite number in forge-gate.config.json, got ${display(value)}.`);
    }
    if (key === "commandTimeoutSeconds" && value <= 0) {
      throw new SetupError(
        `${key} must be greater than zero, got ${value}. Timeouts cannot be disabled — raise it instead if your suite is slow.`,
      );
    }
  }
}

function validateDependencyRules(config) {
  const rules = config.dependencyRules;
  if (rules === undefined) return;
  if (typeof rules !== "object" || rules === null || Array.isArray(rules)) {
    throw new SetupError(
      'dependencyRules must be an object, e.g. "dependencyRules": { "rules": [{ "from": "src/**", "allow": [] }], "unmatched": "allow" }.',
    );
  }
}

function display(value) {
  return JSON.stringify(value);
}

function readConfigFile() {
  const resolved = path.resolve("forge-gate.config.json");
  if (!existsSync(resolved)) return {};
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new SetupError(`invalid forge-gate.config.json: ${error.message}`);
  }
}

function stripEmpty(options) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined && value !== null),
  );
}
