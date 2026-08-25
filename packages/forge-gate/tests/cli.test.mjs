import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(testDir, "../bin/forge-gate.mjs");

function makeTempDir(t, prefix) {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function makeBadProject(t) {
  const dir = makeTempDir(t, "gnt-cli-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  writeFileSync(
    path.join(src, "bad.js"),
    "function tangled(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n",
  );
  const coverage = path.join(dir, "coverage");
  mkdirSync(coverage);
  writeFileSync(
    path.join(coverage, "coverage-summary.json"),
    JSON.stringify({ [path.join(src, "bad.js")]: { lines: { pct: 0 } } }),
  );
  return dir;
}

function runCli(args, cwdDir) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", cwd: cwdDir });
}

test("cli exits 2 when requested gate lacks its command config", (t) => {
  const dir = makeTempDir(t, "gnt-cli-empty-");
  const result = runCli(["check", "--spec"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /testCommand/);
});

test("cli exits 0 when threshold flag raises limit above violation", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crap", "--crap=40"], dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /crap gates passed/);
});

test("cli exits 1 on crap violation with actionable output", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crap"], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tangled/);
  assert.match(result.stderr, /CRAP 20 > 8/);
});
