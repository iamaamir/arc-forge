import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import defaultProfile from "../profiles/default.mjs";
import { SetupError } from "./errors.mjs";

export const defaultConfig = {
  roots: ["src"],
  extensions: [".js", ".mjs", ".cjs", ".jsx"],
  ignore: ["node_modules", ".git", "dist", "coverage", "reports"],
  crapThreshold: 8,
  coverageFinalPath: "coverage/coverage-final.json",
  mutationReportPath: "reports/mutation/mutation.json",
  mutationScoreThreshold: 85,
  testCommand: "",
  qaCommand: "",
  commandTimeoutSeconds: 300,
};

export async function loadConfigAsync(options = {}) {
  const merged = { ...defaultConfig, ...defaultProfile, ...readConfigFile(), ...stripEmpty(options) };
  if (Array.isArray(merged.roots) && merged.roots.length === 0) {
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
