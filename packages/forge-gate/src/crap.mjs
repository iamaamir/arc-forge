import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { analyzeFunctions } from "./complexity.mjs";
import { listFiles } from "./filelist.mjs";
import { loadCoverage } from "./coverage.mjs";
import { SetupError } from "./errors.mjs";

export function crapFor(cc, coveragePct) {
  return cc * cc * (1 - coveragePct / 100) + cc;
}

export function findCrapViolations(config) {
  const { coverageFor } = loadCoverage(config.coverageFinalPath);
  return listFiles(config)
    .flatMap((filePath) => crapViolationsForFile(filePath, config, coverageFor))
    .sort((a, b) => b.crap - a.crap);
}

function crapViolationsForFile(filePath, config, coverageFor) {
  let functions;
  try {
    const source = readFileSync(filePath, "utf8");
    functions = analyzeFunctions(source);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const relative = path.relative(process.cwd(), filePath);
    const loc = error.loc ? `:${error.loc.line}:${error.loc.column}` : "";
    throw new SetupError(
      `cannot parse ${relative}${loc} — fix the file or remove it from roots/extensions`,
    );
  }
  return functions.flatMap((fn) => {
    const coverage = coverageFor(filePath, fn.line, fn.endLine);
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
