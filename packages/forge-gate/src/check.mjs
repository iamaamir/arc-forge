import { findCrapViolations } from "./crap.mjs";
import { getMutationScore, mutationViolation } from "./mutation.mjs";
import { runCommand } from "./commands.mjs";
import { SetupError } from "./errors.mjs";

const GATE_ORDER = ["spec", "crap", "mutation", "qa"];

export async function runGatesAsync(requestedGates, config) {
  const gates = GATE_ORDER.filter((gate) => requestedGates.includes(gate));
  try {
    return await runAllGates(gates, config);
  } catch (error) {
    return toSetupFailure(error);
  }
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
  const result = runCommand(config[key]);
  return result.status === 0 ? [] : [`${key} failed:\n${result.output}`];
}

function runCrapGate(config) {
  const violations = findCrapViolations(config);
  if (violations.length === 0) return [];
  return ["CRAP gate failed:", ...violations.map((violation) => `  ${violation.message}`)];
}

function runMutationGate(config) {
  const score = getMutationScore(config.mutationReportPath);
  if (score >= config.mutationScoreThreshold) return [];
  return [mutationViolation(score, config.mutationScoreThreshold)];
}
