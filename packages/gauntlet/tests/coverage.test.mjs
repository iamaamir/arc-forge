import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { loadCoverageSummary, readLineCoverage } from "../src/coverage.mjs";
import { SetupError } from "../src/errors.mjs";

const cwd = process.cwd();

function withTempProject(t, summary) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cov-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(path.join(coverageDir, "coverage-summary.json"), JSON.stringify(summary));
  return dir;
}

test("missing coverage summary raises SetupError with remedy", () => {
  const missing = path.join(tmpdir(), "gnt-cov-nowhere", "cov.json");
  assert.throws(
    () => loadCoverageSummary(missing),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, new RegExp(`^no coverage summary at ${missing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      assert.match(error.message, /npx c8 --reporter=json-summary/);
      return true;
    },
  );
});

test("lookup by canonical absolute path", (t) => {
  const file = path.join("/somewhere", "proj", "src", "sample.js");
  const dir = withTempProject(t, { [file]: { lines: { pct: 62.5 } } });
  process.chdir(dir);
  assert.equal(readLineCoverage(path.join(dir, "coverage", "coverage-summary.json"), file), 62.5);
});

test("lookup resolves relative and ./-prefixed paths by suffix", (t) => {
  const file = path.join("/somewhere", "proj", "src", "sample.js");
  const dir = withTempProject(t, { [file]: { lines: { pct: 40 } } });
  process.chdir(dir);
  const lookup = loadCoverageSummary(path.join(dir, "coverage", "coverage-summary.json"));
  assert.equal(lookup("./src/sample.js"), 40);
  assert.equal(lookup("src/sample.js"), 40);
});

test("suffix matching requires a path segment boundary", (t) => {
  const decoy = path.join("/somewhere", "proj", "asample.js");
  const dir = withTempProject(t, { [decoy]: { lines: { pct: 55 } } });
  process.chdir(dir);
  const lookup = loadCoverageSummary(path.join(dir, "coverage", "coverage-summary.json"));
  assert.equal(lookup("src/sample.js"), 0);
});

test("./-prefixed paths still match suffixes for files missing on disk", (t) => {
  const gone = path.join("/somewhere", "proj", "src", "gone.js");
  const dir = withTempProject(t, { [gone]: { lines: { pct: 30 } } });
  process.chdir(dir);
  const lookup = loadCoverageSummary(path.join(dir, "coverage", "coverage-summary.json"));
  assert.equal(lookup("./src/gone.js"), 30);
});

test("unknown files count as zero coverage", (t) => {
  const known = path.join("/somewhere", "proj", "known.js");
  const dir = withTempProject(t, { [known]: { lines: { pct: 90 } } });
  process.chdir(dir);
  const lookup = loadCoverageSummary(path.join(dir, "coverage", "coverage-summary.json"));
  assert.equal(lookup("unknown.js"), 0);
});

test("entries without line data count as zero coverage", (t) => {
  const file = path.join("/somewhere", "proj", "nolines.js");
  const dir = withTempProject(t, { [file]: {} });
  process.chdir(dir);
  const lookup = loadCoverageSummary(path.join(dir, "coverage", "coverage-summary.json"));
  assert.equal(lookup(file), 0);
});

test("default path is used when summaryPath is undefined", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cov-def-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  const sample = path.join(dir, "src", "sample.js");
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(path.join(coverageDir, "coverage-summary.json"), JSON.stringify({ [sample]: { lines: { pct: 93.1 } } }));
  process.chdir(dir);
  assert.equal(readLineCoverage(undefined, "src/sample.js"), 93.1);
});
