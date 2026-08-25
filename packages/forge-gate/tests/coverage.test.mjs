import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { loadCoverage } from "../src/coverage.mjs";
import { SetupError } from "../src/errors.mjs";

const cwd = process.cwd();

function istanbulEntry(statements) {
  const statementMap = {};
  const s = {};
  statements.forEach(([line, count], index) => {
    statementMap[index] = { start: { line, column: 0 }, end: { line, column: 1 } };
    s[index] = count;
  });
  return { statementMap, s };
}

function withTempProject(t, coverage) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cov-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(path.join(coverageDir, "coverage-final.json"), JSON.stringify(coverage));
  return dir;
}

function finalPath(dir) {
  return path.join(dir, "coverage", "coverage-final.json");
}

test("corrupt coverage report raises SetupError naming the file", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cov-bad-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const finalJson = path.join(dir, "cov.json");
  writeFileSync(finalJson, "{bad json");
  assert.throws(
    () => loadCoverage(finalJson),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, new RegExp(`^invalid coverage data at ${finalJson.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      return true;
    },
  );
});

test("missing coverage report raises SetupError with remedy", () => {
  const missing = path.join(tmpdir(), "gnt-cov-nowhere", "cov.json");
  assert.throws(
    () => loadCoverage(missing),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, new RegExp(`^no coverage data at ${missing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      assert.match(error.message, /npx c8 --reporter=json/);
      return true;
    },
  );
});

test("lookup by canonical absolute path", (t) => {
  const file = path.join("/somewhere", "proj", "src", "sample.js");
  const dir = withTempProject(t, { [file]: istanbulEntry([[1, 1]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(file, 1, 1), 100);
});

test("lookup resolves relative and ./-prefixed paths by suffix", (t) => {
  const file = path.join("/somewhere", "proj", "src", "sample.js");
  const dir = withTempProject(t, { [file]: istanbulEntry([[1, 1], [2, 0]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor("./src/sample.js", 1, 2), 50);
  assert.equal(lookup.coverageFor("src/sample.js", 1, 2), 50);
});

test("suffix matching requires a path segment boundary", (t) => {
  const decoy = path.join("/somewhere", "proj", "asample.js");
  const dir = withTempProject(t, { [decoy]: istanbulEntry([[1, 1]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor("src/sample.js", 1, 1), 0);
});

test("ambiguous suffix keys raise SetupError listing candidates", (t) => {  const first = path.join("/somewhere", "projA", "src", "sample.js");
  const second = path.join("/elsewhere", "projB", "src", "sample.js");
  const dir = withTempProject(t, { [first]: istanbulEntry([[1, 1]]), [second]: istanbulEntry([[1, 0]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.throws(
    () => lookup.coverageFor("src/sample.js", 1, 1),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /ambiguous coverage keys for src\/sample\.js/);
      assert.match(error.message, new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(error.message, new RegExp(second.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    },
  );
});

test("exact path match wins over other suffix candidates", (t) => {
  const exact = path.join("/somewhere", "proj", "src", "sample.js");
  const decoy = path.join("/somewhere", "other", "nested", "src", "sample.js");
  const dir = withTempProject(t, {
    [exact]: istanbulEntry([[1, 1]]),
    [decoy]: istanbulEntry([[1, 0]]),
  });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(exact, 1, 1), 100);
});

test("unknown files count as zero coverage", (t) => {
  const known = path.join("/somewhere", "proj", "known.js");
  const dir = withTempProject(t, { [known]: istanbulEntry([[1, 1]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor("unknown.js", 1, 1), 0);
});

test("entries without statement data count as zero coverage", (t) => {
  const file = path.join("/somewhere", "proj", "nodata.js");
  const dir = withTempProject(t, { [file]: {} });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(file, 1, 10), 0);
});

test("percentage covers only statements intersecting the function span", (t) => {
  const file = path.join("/somewhere", "proj", "src", "mixed.js");
  const dir = withTempProject(t, {
    [file]: istanbulEntry([
      [1, 1],
      [5, 0],
      [6, 0],
      [20, 1],
    ]),
  });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(file, 4, 10), 0);
  assert.equal(lookup.coverageFor(file, 1, 2), 100);
});

test("function span without intersecting statements counts as fully covered", (t) => {
  const file = path.join("/somewhere", "proj", "src", "ghost.js");
  const dir = withTempProject(t, { [file]: istanbulEntry([[40, 1]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(file, 1, 5), 100);
});

test("statements spanning multiple lines intersect by overlap", (t) => {
  const file = path.join("/somewhere", "proj", "src", "multiline.js");
  const statementMap = {
    0: { start: { line: 2, column: 0 }, end: { line: 4, column: 10 } },
  };
  const dir = withTempProject(t, { [file]: { statementMap, s: { 0: 1 } } });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.equal(lookup.coverageFor(file, 3, 3), 100);
});

test("default path is used when finalPath is undefined", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cov-def-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const sample = path.join(dir, "src", "sample.js");
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-final.json"),
    JSON.stringify({ [sample]: istanbulEntry([[1, 1]]) }),
  );
  process.chdir(dir);
  const lookup = loadCoverage();
  assert.equal(lookup.coverageFor("src/sample.js", 1, 1), 100);
});

test("ambiguous candidates are joined with commas in the error", (t) => {
  const first = path.join("/somewhere", "projA", "src", "sample.js");
  const second = path.join("/elsewhere", "projB", "src", "sample.js");
  const dir = withTempProject(t, { [first]: istanbulEntry([[1, 1]]), [second]: istanbulEntry([[1, 0]]) });
  process.chdir(dir);
  const lookup = loadCoverage(finalPath(dir));
  assert.throws(
    () => lookup.coverageFor("src/sample.js", 1, 1),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.ok(
        error.message.includes(`end in ${path.sep}sample.js: ${first}, ${second}`),
        error.message,
      );
      return true;
    },
  );
});
