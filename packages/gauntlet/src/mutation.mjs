import { existsSync, readFileSync } from "node:fs";
import { SetupError } from "./errors.mjs";

export function getMutationScore(reportPath) {
  if (!existsSync(reportPath)) {
    throw new SetupError(
      `no mutation report at ${reportPath}. Generate one by running Stryker:\n  npx stryker run\nand configure reports: ["json"] in stryker.config.json.`,
    );
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  return report.mutationScore;
}

export function mutationViolation(score, threshold) {
  return `mutation score ${score} is below the required ${threshold} — kill more mutants by asserting on mutant behavior in your tests`;
}
