import { existsSync, readFileSync } from "node:fs";
import { SetupError } from "./errors.mjs";

export function getMutationScore(reportPath) {
  if (!existsSync(reportPath)) {
    throw new SetupError(
      `no mutation report at ${reportPath}. Generate one by running Stryker:\n  npx stryker run\nand configure reports: ["json"] in stryker.config.json.`,
    );
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  return computeMutationScore(report);
}

const DETECTED = new Set(["Killed", "Timeout"]);
const SCORED = new Set([...DETECTED, "Survived", "NoCoverage"]);

export function computeMutationScore(report) {
  const statuses = mutantStatuses(report);
  return ratio(detected(statuses), scored(statuses));
}

function mutantStatuses(report) {
  return Object.values(report.files ?? {}).flatMap((file) => file.mutants ?? []).map((mutant) => mutant.status);
}

function detected(statuses) {
  return statuses.filter((status) => DETECTED.has(status)).length;
}

function scored(statuses) {
  return statuses.filter((status) => SCORED.has(status)).length;
}

function ratio(part, whole) {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export function mutationViolation(score, threshold) {
  return `mutation score ${score} is below the required ${threshold} — kill more mutants by asserting on mutant behavior in your tests`;
}
