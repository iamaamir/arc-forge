import { statSync } from "node:fs";
import path from "node:path";
import { runDepsGate } from "./deps.mjs";
import { findCrapViolations } from "./crap.mjs";
import { listFiles } from "./filelist.mjs";
import { getMutationScore, mutationViolation } from "./mutation.mjs";
import { runCommand } from "./commands.mjs";
import { SetupError } from "./errors.mjs";

const GATE_ORDER = ["deps", "spec", "crap", "mutation", "qa"];

export const UNCONFIGURED_DEPS_NOTICE =
  "dependency rules not configured — some imports are ungated. " +
  "Run the forge-gate skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules";

export function gateOrder() {
  return [...GATE_ORDER];
}

export async function runGatesAsync(requestedGates, config, { defaultSelection = false } = {}) {
  let gates = GATE_ORDER.filter((gate) => requestedGates.includes(gate));
  gates = omitUnconfiguredDeps(gates, config, defaultSelection);
  try {
    return await runAllGates(gates, config);
  } catch (error) {
    return toSetupFailure(error);
  }
}

function omitUnconfiguredDeps(gates, config, defaultSelection) {
  if (!defaultSelection || !gates.includes("deps") || config.dependencyRules !== undefined) return gates;
  console.error(UNCONFIGURED_DEPS_NOTICE);
  return gates.filter((gate) => gate !== "deps");
}

async function runAllGates(gates, config) {
  for (const gate of gates) {
    const failures = await runGate(gate, config);
    if (failures.length > 0) {
      return { status: 1, failedGate: gate, message: failures.join("\n") };
    }
  }
  return { status: 0, failedGate: null, message: summarizePass(gates) };
}

function summarizePass(gates) {
  return gates.length ? `${gates.join(", ")} gates passed` : "no gates selected";
}

function toSetupFailure(error) {
  if (error instanceof SetupError) return { status: 2, failedGate: null, message: error.message };
  throw error;
}

const GATE_RUNNERS = {
  spec: (config) => runCommandGate("testCommand", config),
  qa: (config) => runCommandGate("qaCommand", config),
  deps: (config) => runDepsGate(config),
  crap: (config) => runCrapGate(config),
  mutation: (config) => runMutationGate(config),
};

async function runGate(gate, config) {
  return GATE_RUNNERS[gate](config);
}

function runCommandGate(key, config) {
  if (!config[key]) {
    throw new SetupError(`${key} is not set. Add it to forge-gate.config.json, e.g. "${key}": "npm test".`);
  }
  const result = runCommand(config[key], config.commandTimeoutSeconds);
  if (result.status === 0) return [];
  return [commandGateFailure(key, result)];
}

function commandGateFailure(key, result) {
  if (result.timedOut) {
    return `${key} timed out after ${result.timeoutSeconds}s — raise commandTimeoutSeconds in forge-gate.config.json if your suite is slow`;
  }
  if (spawnError(result)) {
    return `${key} could not run: ${result.error.message}`;
  }
  return `${key} failed:\n${result.output}${truncationNotice(result)}`;
}

// ENOBUFS means the capture buffer was exceeded; the child was killed but its
// drained output is kept and shown instead of being discarded.
function spawnError(result) {
  return Boolean(result.error) && !result.truncated;
}

function truncationNotice(result) {
  return result.truncated
    ? "\n(output exceeded the capture buffer and was truncated — fix the noisy output or raise it at the source)"
    : "";
}

function runCrapGate(config) {
  warnIfCoverageStale(config);
  const violations = findCrapViolations(config);
  if (violations.length === 0) return [];
  return ["CRAP gate failed:", ...violations.map((violation) => `  ${violation.message}`)];
}

function warnIfCoverageStale(config) {
  try {
    const coverageMtime = statSync(path.resolve(config.coverageFinalPath ?? "coverage/coverage-final.json")).mtimeMs;
    const newestSourceMtime = listFiles(config).reduce(
      (newest, file) => Math.max(newest, statSync(file).mtimeMs),
      0,
    );
    if (newestSourceMtime > coverageMtime) {
      console.error("warning: coverage data is older than your sources — re-run tests with c8 before trusting CRAP scores");
    }
  } catch {
    // missing coverage or sources are reported by the gate itself
  }
}

function runMutationGate(config) {
  const score = getMutationScore(config.mutationReportPath);
  if (score >= config.mutationScoreThreshold) return [];
  return [mutationViolation(score, config.mutationScoreThreshold)];
}
