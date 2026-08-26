#!/usr/bin/env node
import { loadConfigAsync } from "../src/config.mjs";
import { runGatesAsync, gateOrder } from "../src/check.mjs";
import { SetupError } from "../src/errors.mjs";

const args = process.argv.slice(2);
const [command, ...rest] = args;
const KNOWN_FLAGS = ["--deps", "--spec", "--crap", "--mutation", "--qa"];
const VALUE_FLAGS = new Set(["--crap", "--mutation", "--roots"]);
const KNOWN_OPTION_PREFIXES = ["--crap=", "--mutation=", "--roots="];
const HELP_FLAGS = new Set(["--help", "-h", "help"]);

// Q3 ruling: help is honored only when no unrecognized flag precedes it — a
// typo'd invocation must fail with exit 2, never masquerade as a help request.
const unknownFlag = firstUnknownFlag(rest);
if (unknownFlag !== undefined) {
  console.error(
    `forge-gate: unknown flag "${unknownFlag}". Known flags: --deps, --spec, --crap, --mutation, --qa, --crap=N, --mutation=N, --roots=a,b or --roots a,b`,
  );
  process.exitCode = 2;
} else if (HELP_FLAGS.has(command) || rest.some((arg) => HELP_FLAGS.has(arg))) {
  printHelp();
} else if (command !== "check") {
  printHelp();
  process.exitCode = 2;
} else await runCheck();

async function runCheck() {
  // Flag validation already happened during dispatch; nothing unknown remains.
  validateNumericFlags();
  // A gate is selected by its bare flag OR any value form (--crap=N / --crap N).
  // When the same option appears multiple times, the last occurrence wins and
  // earlier ones are ignored entirely.
  const gates = KNOWN_FLAGS.filter(
    (flag) => args.includes(flag) || args.some((arg) => arg.startsWith(`${flag}=`)),
  ).map((flag) => flag.slice(2));
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
  // D1: every setup error carries the prefix exactly once, matching the flag
  // and crash paths; gate failures stay unprefixed.
  if (result.status === 2) console.error(`forge-gate: ${result.message}`);
  else if (result.status !== 0) console.error(result.message);
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

function firstUnknownFlag(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (HELP_FLAGS.has(arg)) return undefined;
    if (VALUE_FLAGS.has(arg)) {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) i++;
      continue;
    }
    if (KNOWN_FLAGS.includes(arg)) continue;
    if (KNOWN_OPTION_PREFIXES.some((prefix) => arg.startsWith(prefix))) continue;
    return arg;
  }
  return undefined;
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
  for (let i = args.length - 1; i >= 0; i--) {
    const arg = args[i];
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
    if (arg === name) {
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) return undefined;
      return next;
    }
  }
  return undefined;
}

function printHelp() {
  console.log(`forge-gate

Usage:
  forge-gate check [--deps] [--spec] [--crap] [--mutation] [--qa]
                 [--crap=N | --crap N] [--mutation=N | --mutation N]
                 [--roots=src,lib | --roots src,lib]

Runs deterministic quality gates. With no gate flags, runs all configured
gates; unconfigured optional gates (deps without dependencyRules or qa
without qaCommand in forge-gate.config.json) are skipped with a notice on
stderr. Pass --deps or --qa to enforce them explicitly (exit 2 when
unconfigured).

A value form (--crap=N or --crap N) selects its gate as well as overriding the
threshold. If an option repeats, the last occurrence wins.
Exit codes: 0 pass, 1 gate failure, 2 setup error; --help exits 0 unless an
unrecognized flag precedes it (then exit 2).`);
}
