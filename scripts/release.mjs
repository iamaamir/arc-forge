#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packages = new Set(["one-thing-functions", "forge-gate"]);
const pkgName = process.argv[2] || "one-thing-functions";
const releaseType = process.argv[3] || "patch";
const allowedTypes = new Set(["patch", "minor", "major", "prepatch", "preminor", "premajor", "prerelease"]);

if (!packages.has(pkgName)) {
  console.error(`Unknown package: ${pkgName}`);
  console.error(`Allowed: ${[...packages].join(", ")}`);
  process.exit(1);
}

if (!allowedTypes.has(releaseType)) {
  console.error(`Invalid release type: ${releaseType}`);
  console.error(`Allowed: ${[...allowedTypes].join(", ")}`);
  process.exit(1);
}

ensureCleanWorkingTree();
run("npm", ["test"]);
run("npm", ["version", releaseType, "--workspace", pkgName, "--no-git-tag-version"]);
const version = readPackageVersion(pkgName);
run("git", ["add", "package-lock.json", `packages/${pkgName}/package.json`]);
run("git", ["commit", "-m", `chore(release): bump ${pkgName} to ${version}`]);
run("git", ["tag", `v${version}`]);
run("git", ["push", "origin", currentBranch()]);
run("git", ["push", "origin", `v${version}`]);
console.log(`Released ${pkgName} v${version}`);

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

function readPackageVersion(name) {
  const pkg = JSON.parse(readFileSync(`packages/${name}/package.json`, "utf8"));
  return pkg.version;
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}
