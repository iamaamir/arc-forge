#!/usr/bin/env node
import { loadConfigAsync } from "../src/config.mjs";
import { runGatesAsync, gateOrder } from "../src/check.mjs";
import { SetupError } from "../src/errors.mjs";

const args = process.argv.slice(2);
const command = args[0];
const KNOWN_FLAGS = ["--deps", "--spec", "--crap", "--mutation", "--qa"];
const VALUE_FLAGS = new Set(["--crap", "--mutation", "--roots"]);
const KNOWN_OPTION_PREFIXES = ["--crap=", "--mutation=", "--roots="];

if (command !== "check") {
  printHelp();
  process.exitCode = 2;
} else await runCheck();

async function runCheck() {
  if (!validateFlags()) return;
  if (!validateNumericFlags()) return;
  const gates = KNOWN_FLAGS.filter((flag) => args.includes(flag)).map((flag) => flag.slice(2));
  const options = {
    roots: parseRoots(getOptionValue("--roots")),
    crapThreshold: parseNumber(getOptionValue("--crap")),
    mutationScoreThreshold: parseNumber(getOptionValue("--mutation")),
  };
  try {
    await executeGates(gates.length ? gates : gateOrder(), options, gates.length === 0);
  } catch (error) {
    reportGateCrash(error);
  }
}

async function executeGates(gates, options, defaultSelection) {
  const config = await loadConfigAsync(options);
  const result = await runGatesAsync(gates, config, { defaultSelection });
  if (result.status !== 0) console.error(result.message);
  else console.log(result.message);
  process.exitCode = result.status;
}

function reportGateCrash(error) {
  if (error instanceof SetupError) {
    console.error(`forge-gate: ${error.message}`);
  } else {
    console.error(`forge-gate crashed: ${error.stack}`);
  }
  process.exitCode = 2;
}

function validateFlags() {
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (VALUE_FLAGS.has(arg)) {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) i++;
      continue;
    }
    if (KNOWN_FLAGS.includes(arg)) continue;
    if (KNOWN_OPTION_PREFIXES.some((prefix) => arg.startsWith(prefix))) continue;
    console.error(
      `forge-gate: unknown flag "${arg}". Known flags: --deps, --spec, --crap, --mutation, --qa, --crap=N, --mutation=N, --roots=a,b or --roots a,b`,
    );
    process.exitCode = 2;
    return false;
  }
  return true;
}

function validateNumericFlags() {
  for (const name of ["--crap", "--mutation"]) {
    const value = getOptionValue(name);
    if (value === undefined) continue;
    const number = Number(value);
    if (value === "" || !Number.isFinite(number) || number < 0) {
      console.error(`forge-gate: ${name} expects a finite non-negative number, got "${value}"`);
      process.exitCode = 2;
      return false;
    }
  }
  return true;
}

function parseNumber(value) {
  return value === undefined ? undefined : Number(value);
}

function parseRoots(value) {
  if (value === undefined) return undefined;
  const roots = value.split(",").filter(Boolean);
  return roots.length ? roots : undefined;
}

function getOptionValue(name) {
  const eqForm = args.find((arg) => arg.startsWith(`${name}=`));
  if (eqForm !== undefined) return eqForm.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const next = args[index + 1];
  if (next === undefined || next.startsWith("--")) return undefined;
  return next;
}

function printHelp() {
  console.log(`forge-gate

Usage:
  forge-gate check [--deps] [--spec] [--crap] [--mutation] [--qa]
                 [--crap=N | --crap N] [--mutation=N | --mutation N]
                 [--roots=src,lib | --roots src,lib]

Runs deterministic quality gates. With no gate flags, runs all configured
gates; unconfigured optional gates (deps without dependencyRules in
forge-gate.config.json) are skipped with a notice on stderr. Pass --deps to
enforce dependency rules explicitly (exit 2 when unconfigured).
Exit codes: 0 pass, 1 gate failure, 2 setup error.`);
}
