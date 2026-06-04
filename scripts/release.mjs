#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const releaseType = process.argv[2] || "patch";
const allowedTypes = new Set(["patch", "minor", "major", "prepatch", "preminor", "premajor", "prerelease"]);

if (!allowedTypes.has(releaseType)) {
  console.error(`Invalid release type: ${releaseType}`);
  console.error(`Allowed: ${[...allowedTypes].join(", ")}`);
  process.exit(1);
}

ensureCleanWorkingTree();
run("npm", ["test"]);
run("npm", ["version", releaseType, "--workspace", "one-thing-functions", "--no-git-tag-version"]);
const version = readPackageVersion();
run("git", ["add", "package-lock.json", "packages/one-thing-functions/package.json"]);
run("git", ["commit", "-m", `chore(release): bump one-thing-functions to ${version}`]);
run("git", ["tag", `v${version}`]);
run("git", ["push", "origin", currentBranch()]);
run("git", ["push", "origin", `v${version}`]);
console.log(`Released one-thing-functions v${version}`);

function ensureCleanWorkingTree() {
  const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  if (!status) return;
  console.error("Working tree is not clean. Commit or stash changes before release.");
  console.error(status);
  process.exit(1);
}

function currentBranch() {
  return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync("packages/one-thing-functions/package.json", "utf8"));
  return pkg.version;
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}
