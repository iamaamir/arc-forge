#!/usr/bin/env node
import { loadConfigAsync } from "../src/config.mjs";
import { runGatesAsync } from "../src/check.mjs";

const args = process.argv.slice(2);
const command = args[0];

if (command !== "check") printHelp();
else await runCheck();

async function runCheck() {
  const gates = ["spec", "crap", "mutation", "qa"].filter((gate) => args.includes(`--${gate}`));
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
    console.error(`gauntlet: ${error.message}`);
    process.exitCode = 2;
  }
}

function parseNumber(value) {
  return value === undefined ? undefined : Number(value);
}

function getOptionValue(name) {
  const option = args.find((arg) => arg.startsWith(`${name}=`));
  return option ? option.slice(name.length + 1) : undefined;
}

function printHelp() {
  console.log(`gauntlet

Usage:
  gauntlet check [--spec] [--crap] [--mutation] [--qa]
                 [--crap=N] [--mutation=N] [--roots=src,lib]

Runs deterministic quality gates. With no gate flags, runs all gates.
Exit codes: 0 pass, 1 gate failure, 2 setup error.`);
}
