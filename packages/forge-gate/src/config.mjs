import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import defaultProfile from "../profiles/default.mjs";
import { SetupError } from "./errors.mjs";

export const defaultConfig = { ...defaultProfile };

export async function loadConfigAsync(options = {}) {
  const merged = { ...defaultConfig, ...readConfigFile(), ...stripEmpty(options) };
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
  return merged;
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
