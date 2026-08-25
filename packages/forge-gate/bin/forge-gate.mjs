#!/usr/bin/env node
import { loadConfigAsync } from "../src/config.mjs";
import { runGatesAsync } from "../src/check.mjs";
import { SetupError } from "../src/errors.mjs";

const args = process.argv.slice(2);
const command = args[0];

if (command !== "check") {
  printHelp();
  process.exitCode = 2;
} else await runCheck();

async function runCheck() {
  const gates = ["spec", "crap", "mutation", "qa"].filter((gate) => args.includes(`--${gate}`));
  if (!validateNumericFlags()) return;
  const options = {
    roots: getOptionValue("--roots")?.split(",").filter(Boolean),
    crapThreshold: parseNumber(getOptionValue("--crap")),
    mutationScoreThreshold: parseNumber(getOptionValue("--mutation")),
  };
  try {
    const config = await loadConfigAsync(options);
    const result = await runGatesAsync(gates.length ? gates : ["spec", "crap", "mutation", "qa"], config);
    if (result.status !== 0) console.error(result.message);
    else console.log(result.message);
    process.exitCode = result.status;
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(`forge-gate: ${error.message}`);
    } else {
      console.error(`forge-gate crashed: ${error.stack}`);
    }
    process.exitCode = 2;
  }
}

function validateNumericFlags() {
  for (const name of ["--crap", "--mutation"]) {
    const value = getOptionValue(name);
    if (value !== undefined && !Number.isFinite(Number(value))) {
      console.error(`forge-gate: ${name} expects a number, got "${value}"`);
      process.exitCode = 2;
      return false;
    }
  }
  return true;
}

function parseNumber(value) {
  return value === undefined ? undefined : Number(value);
}

function getOptionValue(name) {
  const option = args.find((arg) => arg.startsWith(`${name}=`));
  return option ? option.slice(name.length + 1) : undefined;
}

function printHelp() {
  console.log(`forge-gate

Usage:
  forge-gate check [--spec] [--crap] [--mutation] [--qa]
                 [--crap=N] [--mutation=N] [--roots=src,lib]

Runs deterministic quality gates. With no gate flags, runs all gates.
Exit codes: 0 pass, 1 gate failure, 2 setup error.`);
}
