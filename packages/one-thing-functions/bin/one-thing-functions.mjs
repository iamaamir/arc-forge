#!/usr/bin/env node
import { checkProjectAsync, formatViolations } from "../src/check.mjs";

const args = process.argv.slice(2);
const command = args[0] || "help";

if (command === "check") await runCheck();
else printHelp();

async function runCheck() {
  const roots = getRoots();
  const configPath = getOptionValue("--config");
  const profile = getOptionValue("--profile");
  const violations = await checkProjectAsync({ roots, configPath, profile });
  if (violations.length === 0) return;
  console.error(formatViolations(violations));
  process.exitCode = 1;
}

function getRoots() {
  const roots = args.slice(1).filter((arg) => !arg.startsWith("--"));
  return roots.length ? roots : ["src"];
}

function getOptionValue(name) {
  const option = args.find((arg) => arg.startsWith(`${name}=`));
  return option ? option.slice(name.length + 1) : undefined;
}

function printHelp() {
  console.log(`one-thing-functions

Usage:
  one-thing-functions check <roots...> [--config=path] [--profile=fp-first]
`);
}
