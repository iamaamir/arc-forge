import { findCrapViolations } from "./crap.mjs";
import { getMutationScore, mutationViolation } from "./mutation.mjs";
import { runCommand } from "./commands.mjs";
import { SetupError } from "./errors.mjs";

const GATE_ORDER = ["spec", "crap", "mutation", "qa"];

export async function runGatesAsync(requestedGates, config) {
  const gates = GATE_ORDER.filter((gate) => requestedGates.includes(gate));
  try {
    for (const gate of gates) {
      const failures = await runGate(gate, config);
      if (failures.length > 0) {
        return { status: 1, failedGate: gate, message: failures.join("\n") };
      }
    }
    return {
      status: 0,
      failedGate: null,
      message: gates.length ? `${gates.join(", ")} gates passed` : "no gates selected",
    };
  } catch (error) {
    if (error instanceof SetupError) return { status: 2, failedGate: null, message: error.message };
    throw error;
  }
}

async function runGate(gate, config) {
  if (gate === "spec") return runCommandGate("testCommand", config);
  if (gate === "qa") return runCommandGate("qaCommand", config);
  if (gate === "crap") return runCrapGate(config);
  if (gate === "mutation") return runMutationGate(config);
  return [];
}

function runCommandGate(key, config) {
  if (!config[key]) {
    throw new SetupError(`${key} is not set. Add it to gauntlet.config.json, e.g. "${key}": "npm test".`);
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
