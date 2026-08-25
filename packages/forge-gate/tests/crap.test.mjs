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
  makeCoverage(dir, { covered: 8, total: 8 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});

test("CRAP just above threshold is flagged", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 5, total: 8 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].crap, 10);
});

test("violations are listed worst offenders first", (t) => {
  const dir = makeProject(t);
  writeFileSync(
    path.join(dir, "src", "sample.js"),
    "function mild(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n"
      + "function worst(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) {\n        if (a > 4) return 2;\n      }\n    }\n  }\n  return 0;\n}\n",
  );
  makeCoverage(dir, { covered: 0, total: 18 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations.map((violation) => violation.crap).sort((a, b) => b - a), [30, 20]);
  assert.equal(violations[0].name, "worst");
  assert.equal(violations[0].crap, 30);
  assert.equal(violations[1].name, "mild");
});

test("functions in the same file get their own coverage", (t) => {
  const dir = makeProject(t);
  writeFileSync(
    path.join(dir, "src", "sample.js"),
    "function trivial(a) {\n  return a;\n}\n"
      + "function tangled(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n",
  );
  makeCoverage(dir, {
    covered: 1,
    total: 6,
    statements: [[2, 1], [5, 0], [6, 0], [7, 0], [9, 0], [11, 0]],
  });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].name, "tangled");
  assert.equal(violations[0].coverage, 0);
  assert.equal(violations[0].crap, 20);
});

test("function span without statements counts as fully covered", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 0, total: 0 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
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

function makeCoverage(dir, { covered, total, statements, fileName = "sample.js" }) {
  const pairs = statements ?? Array.from({ length: total }, (_, index) => [index + 1, index < covered ? 1 : 0]);
  const statementMap = {};
  const s = {};
  pairs.forEach(([line, count], index) => {
    statementMap[index] = { start: { line, column: 0 }, end: { line, column: 1 } };
    s[index] = count;
  });
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-final.json"),
    JSON.stringify({ [path.join(dir, "src", fileName)]: { statementMap, s } }),
  );
}

test("findCrapViolations flags high-complexity uncovered functions", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 0, total: 8 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].name, "tangled");
  assert.ok(violations[0].crap > 8);
  assert.match(violations[0].message, /refactor or raise the threshold/);
});

test("findCrapViolations passes clean projects", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 8, total: 8 });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});

test("missing coverage report throws SetupError", (t) => {
  const dir = makeProject(t);
  process.chdir(dir);
  assert.throws(
    () => findCrapViolations({ roots: ["src"], crapThreshold: 8 }),
    SetupError,
  );
});

test("file absent from report is treated as 0% coverage", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 8, total: 8, fileName: "other.js" });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].coverage, 0);
  assert.ok(violations[0].crap > 8);
});

test("ambiguous suffix keys raise SetupError", (t) => {
  const dir = makeProject(t);
  const statementMap = {};
  const s = {};
  for (let i = 0; i < 8; i++) {
    statementMap[i] = { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: 1 } };
    s[i] = 0;
  }
  const entry = JSON.stringify({ statementMap, s });
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-final.json"),
    `{"${path.join("/elsewhere", "projA", "src", "sample.js")}":${entry},"${path.join("/somewhere", "projB", "src", "sample.js")}":${entry}}`,
  );
  process.chdir(dir);
  assert.throws(
    () => findCrapViolations({ roots: ["src"], crapThreshold: 8 }),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /ambiguous coverage keys/);
      return true;
    },
  );
});

test("ignored directories are not scanned", (t) => {
  const dir = makeProject(t);
  makeCoverage(dir, { covered: 8, total: 8 });
  const junkDir = path.join(dir, "src", "node_modules");
  mkdirSync(junkDir);
  writeFileSync(path.join(junkDir, "junk.js"), "function tangled(a) {\n  if (a > 1) {\n    if (a > 2) {\n      if (a > 3) return 1;\n    }\n  }\n  return 0;\n}\n");
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.deepEqual(violations, []);
});

test("uncovered TypeScript function is flagged at its original line", (t) => {
  const dir = makeTsProject(t);
  makeCoverage(dir, { covered: 0, total: 8, fileName: "sample.ts" });
  process.chdir(dir);
  const violations = findCrapViolations({ roots: ["src"], crapThreshold: 8 });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].name, "tangled");
  assert.equal(violations[0].line, 5);
  assert.equal(violations[0].cc, 4);
});

test("TypeScript parameter properties fail the gate with a SetupError", (t) => {
  const dir = makeTsProject(t, `class Greeter {\n  constructor(private service: Logger) {}\n}\n`);
  makeCoverage(dir, { covered: 8, total: 8, fileName: "sample.ts" });
  process.chdir(dir);
  assert.throws(
    () => findCrapViolations({ roots: ["src"], crapThreshold: 8 }),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /parameter propert/i);
      assert.match(error.message, /sample\.ts/);
      return true;
    },
  );
});

function makeTsProject(t, source = DEFAULT_TS_SOURCE) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-crap-ts-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  mkdirSync(path.join(dir, "src"));
  writeFileSync(path.join(dir, "src", "sample.ts"), source);
  return dir;
}

const DEFAULT_TS_SOURCE = `interface Bounds {
  max: number;
}

function tangled(a: number, bounds: Bounds): number {
  if (a > bounds.max) {
    if (a > 2) {
      if (a > 3) return 1;
    }
  }
  return 0;
}
`;
