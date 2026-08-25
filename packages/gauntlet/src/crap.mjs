import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { analyzeFunctions } from "./complexity.mjs";
import { listFiles } from "./filelist.mjs";
import { loadCoverageSummary } from "./coverage.mjs";

export function crapFor(cc, coveragePct) {
  return cc * cc * (1 - coveragePct / 100) + cc;
}

export function findCrapViolations(config) {
  const lookupLineCoverage = loadCoverageSummary(config.coverageSummaryPath);
  return listFiles(config).flatMap((filePath) => crapViolationsForFile(filePath, config, lookupLineCoverage));
}

function crapViolationsForFile(filePath, config, lookupLineCoverage) {
  const source = readFileSync(filePath, "utf8");
  return analyzeFunctions(source).flatMap((fn) => {
    const coverage = lookupLineCoverage(filePath);
    const crap = Math.ceil(crapFor(fn.cc, coverage));
    if (crap <= config.crapThreshold) return [];
    const relative = path.relative(process.cwd(), filePath);
    return [{
      file: relative,
      name: fn.name,
      line: fn.line,
      cc: fn.cc,
      coverage,
      crap,
      message: `${relative}:${fn.line} function \`${fn.name}\` CRAP ${crap} > ${config.crapThreshold} — refactor or raise the threshold`,
    }];
  });
}
