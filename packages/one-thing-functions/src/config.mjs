import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fpFirst from "../profiles/fp-first.mjs";
import legacyMigration from "../profiles/legacy-migration.mjs";
import ooFriendly from "../profiles/oo-friendly.mjs";

const profiles = {
  "fp-first": fpFirst,
  "oo-friendly": ooFriendly,
  "legacy-migration": legacyMigration,
};

export const defaultConfig = {
  roots: ["src"],
  maxLines: 25,
  profile: "fp-first",
  allowFactoryObjectParams: true,
  allowClasses: false,
  factoryNamePattern: "^(make|create|from)[A-Z_]",
  utilityAllowlist: [],
  extensions: [".js", ".mjs", ".cjs"],
  ignore: ["node_modules", ".git", "dist", "coverage"],
};

export async function loadConfig(options = {}) {
  const fileConfig = await loadConfigFile(options.configPath);
  return mergeConfig({ ...fileConfig, ...options });
}

export function mergeConfig(config = {}) {
  const profile = profiles[config.profile || defaultConfig.profile] || profiles[defaultConfig.profile];
  return { ...defaultConfig, ...profile, ...config };
}

async function loadConfigFile(configPath) {
  const resolved = resolveConfigPath(configPath);
  if (!resolved) return {};
  const module = await import(pathToFileURL(resolved).href);
  return module.default || {};
}

function resolveConfigPath(configPath) {
  if (configPath) return path.resolve(configPath);
  const defaultPath = path.resolve("one-thing-functions.config.mjs");
  return existsSync(defaultPath) ? defaultPath : null;
}
