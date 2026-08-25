import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { crapFor, findCrapViolations } from "../src/crap.mjs";
import { SetupError } from "../src/errors.mjs";

const cwd = process.cwd();

test("CRAP equals complexity at full coverage", () => {
  assert.equal(crapFor(4, 100), 4);
  assert.equal(crapFor(1, 100), 1);
});

test("CRAP formula matches comp^2*(1-cov)+cc", () => {
  assert.equal(crapFor(4, 50), 12);
  assert.equal(crapFor(2, 0), 6);
});

test("CRAP exactly at threshold is not a violation", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 75);
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});

test("CRAP just above threshold is flagged", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 70);
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].crap, 9);
});

function makeProject(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-crap-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const src = path.join(dir, "src");
  mkdirSync(src);
  writeFileSync(
    path.join(src, "sample.js"),
    "function tangled(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n",
  );
  return dir;
}

function makeCoverage(dir, pct, fileName = "sample.js") {
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-summary.json"),
    JSON.stringify({
      [path.join(dir, "src", fileName)]: { lines: { pct } },
    }),
  );
}

test("findCrapViolations flags high-complexity uncovered functions", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 0);
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].name, "tangled");
  assert.ok(violations[0].crap > 8);
  assert.match(violations[0].message, /refactor or raise the threshold/);
});

test("findCrapViolations passes clean projects", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 100);
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});

test("missing coverage summary throws SetupError", (t) => {
  const dir = makeProject(t);
  process.chdir(dir);
  assert.throws(
    () => findCrapViolations({ roots: ["src"], crapThreshold: 8 }),
    SetupError,
  );
});

test("file absent from summary is treated as 0% coverage", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 100, "other.js");
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].coverage, 0);
  assert.ok(violations[0].crap > 8);
});

test("ignored directories are not scanned", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, 100);
  const junkDir = path.join(dir, "src", "node_modules");
  mkdirSync(junkDir);
  writeFileSync(path.join(junkDir, "junk.js"), "function tangled(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n");
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});
