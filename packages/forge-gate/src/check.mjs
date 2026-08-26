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

export const UNCONFIGURED_QA_NOTICE =
  'qaCommand not configured — QA gate skipped. Add "qaCommand" to forge-gate.config.json to enforce it.';

const OPTIONAL_GATES = [
  { gate: "deps", isConfigured: (config) => config.dependencyRules !== undefined, notice: UNCONFIGURED_DEPS_NOTICE },
  { gate: "qa", isConfigured: (config) => Boolean(config.qaCommand), notice: UNCONFIGURED_QA_NOTICE },
];

export function gateOrder() {
  return [...GATE_ORDER];
}

export async function runGatesAsync(requestedGates, config, { defaultSelection = false } = {}) {
  let gates = GATE_ORDER.filter((gate) => requestedGates.includes(gate));
  gates = omitUnconfiguredOptional(gates, config, defaultSelection);
  try {
    return await runAllGates(gates, config);
  } catch (error) {
    return toSetupFailure(error);
  }
}

function omitUnconfiguredOptional(gates, config, defaultSelection) {
  if (!defaultSelection) return gates;
  return gates.filter((gate) => {
    const optional = OPTIONAL_GATES.find((entry) => entry.gate === gate);
    if (!optional || optional.isConfigured(config)) return true;
    console.error(optional.notice);
    return false;
  });
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

const ECHO_HEAD_BYTES = 8 * 1024;
const ECHO_TAIL_BYTES = 8 * 1024;

function commandGateFailure(key, result) {
  if (result.timedOut) {
    return (
      `${key} timed out after ${result.timeoutSeconds}s — raise commandTimeoutSeconds in forge-gate.config.json ` +
      `if your suite is slow${capturedOutput(result)}`
    );
  }
  if (spawnError(result)) {
    return `${key} could not run: ${result.error.message}${capturedOutput(result)}`;
  }
  return `${key} failed:${capturedOutput(result)}${bufferNotice(result)}`;
}

function capturedOutput(result) {
  if (!result.output) return "";
  return `\n${capEcho(result.output)}`;
}

// Echoing megabytes of child output can ENOBUFS our own parent's capture
// buffer, killing forge-gate before any exit code is set ("agents cannot argue
// with an exit code"). Show head and tail only, with the total size stated.
function capEcho(output) {
  const totalBytes = Buffer.byteLength(output);
  if (totalBytes <= ECHO_HEAD_BYTES + ECHO_TAIL_BYTES) return output;
  return (
    `${output.slice(0, ECHO_HEAD_BYTES)}\n` +
    `[output truncated for display: ${totalBytes} bytes captured — showing first ${ECHO_HEAD_BYTES} ` +
    `and last ${ECHO_TAIL_BYTES}; redirect your command's output to a file to inspect the full log]\n` +
    `${output.slice(-ECHO_TAIL_BYTES)}`
  );
}

// ENOBUFS means the capture buffer was exceeded; the child was killed but its
// drained output is kept and shown instead of being discarded.
function spawnError(result) {
  return Boolean(result.error) && !result.truncated;
}

function bufferNotice(result) {
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
