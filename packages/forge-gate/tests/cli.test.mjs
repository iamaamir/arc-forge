import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { mutationViolation } from "../src/mutation.mjs";

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
  const statementMap = {};
  const s = {};
  for (let i = 0; i < 8; i++) {
    statementMap[i] = { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: 1 } };
    s[i] = 0;
  }
  writeFileSync(
    path.join(coverage, "coverage-final.json"),
    JSON.stringify({ [path.join(src, "bad.js")]: { statementMap, s } }),
  );
  return dir;
}

test("cli rejects unknown flags without running gates", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crape"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown flag "--crape"/);
  assert.doesNotMatch(result.stderr, /testCommand|CRAP gate failed|gates passed/);
});

test("cli treats empty roots flag as unset so defaults apply", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crap", "--roots="], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tangled/);
});

test("cli exits 2 when config sets roots to an empty array", (t) => {
  const dir = makeBadProject(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ roots: [] }));
  const result = runCli(["check", "--crap"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /roots cannot be empty/);
});

test("cli accepts space-separated option form for numeric flags", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crap", "40"], dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /crap gates passed/);
});

test("cli accepts space-separated roots flag and scans that root", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "--crap", "--roots", path.join(dir, "src")], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tangled/);
});

test("cli rejects single-dash flags", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "-crape"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown flag "-crape"/);
});

test("cli rejects stray positionals after check", (t) => {
  const dir = makeBadProject(t);
  const result = runCli(["check", "oops"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown flag "oops"/);
});

test("cli exits 2 with filename when a source file cannot be parsed", (t) => {
  const dir = makeBadProject(t);
  writeFileSync(path.join(dir, "src", "broken.js"), "function oops( {\n");
  const result = runCli(["check", "--crap"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /cannot parse .*broken\.js:\d+:\d+ — fix the file or remove it from roots\/extensions/);
  assert.doesNotMatch(result.stderr, /crashed/);
});

test("cli exits 2 cleanly when config lists .jsx extension", (t) => {
  const dir = makeBadProject(t);
  writeFileSync(path.join(dir, "src", "widget.jsx"), "export default () => <div>hi</div>;\n");
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ extensions: [".js", ".jsx"] }));
  const result = runCli(["check", "--crap"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no parser for extension "\.jsx"/);
  assert.match(result.stderr, /\.jsx\/\.tsx are not supported/);
});

test("cli rejects empty numeric flag value", (t) => {
  const dir = makeTempDir(t, "gnt-cli-num-");
  const result = runCli(["check", "--mutation="], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--mutation expects a finite non-negative number, got ""/);
});

test("cli rejects negative numeric flag value", (t) => {
  const dir = makeTempDir(t, "gnt-cli-num-");
  const result = runCli(["check", "--mutation=-5"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--mutation expects a finite non-negative number, got "-5"/);
});

test("cli rejects infinite numeric flag value", (t) => {
  const dir = makeTempDir(t, "gnt-cli-num-");
  const result = runCli(["check", "--crap=Infinity"], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--crap expects a finite non-negative number, got "Infinity"/);
});

test("mutationViolation rounds score to one decimal", () => {
  const message = mutationViolation(83.33333333333333, 85);
  assert.match(message, /mutation score 83\.3 /);
});

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

test("cli warns on stale coverage without changing the exit code", (t) => {
  const dir = makeBadProject(t);
  utimesSync(path.join(dir, "coverage", "coverage-final.json"), new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
  const result = runCli(["check", "--crap", "--crap=40"], dir);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /warning: coverage data is older than your sources/);
});
