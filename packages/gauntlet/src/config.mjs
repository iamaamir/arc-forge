import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import defaultProfile from "../profiles/default.mjs";
import { SetupError } from "./errors.mjs";

export const defaultConfig = {
  roots: ["src"],
  extensions: [".js", ".mjs", ".cjs", ".jsx"],
  ignore: ["node_modules", ".git", "dist", "coverage", "reports"],
  crapThreshold: 8,
  coverageSummaryPath: "coverage/coverage-summary.json",
  mutationReportPath: "reports/mutation/mutation.json",
  mutationScoreThreshold: 85,
  testCommand: "",
  qaCommand: "",
};

export async function loadConfigAsync(options = {}) {
  const fileConfig = readConfigFile();
  return { ...defaultConfig, ...defaultProfile, ...fileConfig, ...stripEmpty(options) };
}

function readConfigFile() {
  const resolved = path.resolve("gauntlet.config.json");
  if (!existsSync(resolved)) return {};
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new SetupError(`invalid gauntlet.config.json: ${error.message}`);
  }
}

function stripEmpty(options) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined && value !== null),
  );
}
