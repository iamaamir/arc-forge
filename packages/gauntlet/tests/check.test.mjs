import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runGatesAsync } from "../src/check.mjs";

const cwd = process.cwd();

function makeTempDir(t, prefix) {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

function writeMutationReport(dir, killed, survived = 0) {
  const mutants = [
    ...Array.from({ length: killed }, () => ({ status: "Killed" })),
    ...Array.from({ length: survived }, () => ({ status: "Survived" })),
  ];
  const reportsDir = path.join(dir, "reports", "mutation");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(
    path.join(reportsDir, "mutation.json"),
    JSON.stringify({ schemaVersion: "1.0", files: { "src/a.mjs": { source: "", mutants } } }),
  );
}

test("spec gate passes when testCommand exits zero", async () => {
  const result = await runGatesAsync(["spec"], { testCommand: "true" });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "spec gates passed" });
});

test("multiple passing gates are listed comma-separated", async () => {
  const result = await runGatesAsync(["qa", "spec"], { testCommand: "true", qaCommand: "true" });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "spec, qa gates passed" });
});

test("spec gate fails when testCommand exits nonzero", async () => {
  const result = await runGatesAsync(["spec"], { testCommand: "false" });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "spec");
  assert.equal(result.message, 'testCommand failed:\n');
});

test("missing qaCommand is a setup error with actionable message", async () => {
  const result = await runGatesAsync(["qa"], { qaCommand: "" });
  assert.equal(result.status, 2);
  assert.equal(
    result.message,
    'qaCommand is not set. Add it to gauntlet.config.json, e.g. "qaCommand": "npm test".',
  );
});

test("stops at first failing gate and follows canonical order", async () => {
  const result = await runGatesAsync(["qa", "spec"], { testCommand: "false", qaCommand: "true" });
  assert.equal(result.failedGate, "spec");
});

test("requesting every gate in reverse order still runs spec first", async (t) => {
  const dir = makeTempDir(t, "gnt-order-");
  process.chdir(dir);
  const result = await runGatesAsync(["qa", "mutation", "crap"], {});
  assert.equal(result.status, 2);
  assert.match(result.message, /^no coverage summary at/);
});

test("selecting no known gates reports no gates selected", async () => {
  const result = await runGatesAsync([], {});
  assert.deepEqual(result, { status: 0, failedGate: null, message: "no gates selected" });
});

test("crap gate failure message lists header and indented violations", async (t) => {
  const dir = makeTempDir(t, "gnt-crapmsg-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  writeFileSync(
    path.join(src, "tangled.js"),
    "function a(x) {\n  if (x > 1) {\n    if (x > 2) {\n      if (x > 3) return 1;\n    }\n  }\n  return 0;\n}\n",
  );
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-summary.json"),
    JSON.stringify({ [path.join(src, "tangled.js")]: { lines: { pct: 0 } } }),
  );
  process.chdir(dir);
  const result = await runGatesAsync(["crap"], { roots: ["src"], crapThreshold: 8 });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "crap");
  assert.equal(
    result.message,
    `CRAP gate failed:\n  ${path.join("src", "tangled.js")}:1 function \`a\` CRAP 20 > 8 — refactor or raise the threshold`,
  );
});

test("multiple violations are joined with newlines in order", async (t) => {
  const dir = makeTempDir(t, "gnt-crapjoin-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  const tangled = "function t(x) {\n  if (x > 1) {\n    if (x > 2) {\n      if (x > 3) return 1;\n    }\n  }\n  return 0;\n}\n";
  writeFileSync(path.join(src, "b_second.mjs"), tangled);
  writeFileSync(path.join(src, "a_first.mjs"), tangled);
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir);
  writeFileSync(
    path.join(coverageDir, "coverage-summary.json"),
    JSON.stringify({
      [path.join(src, "a_first.mjs")]: { lines: { pct: 0 } },
      [path.join(src, "b_second.mjs")]: { lines: { pct: 0 } },
    }),
  );
  process.chdir(dir);
  const result = await runGatesAsync(["crap"], { roots: ["src"], crapThreshold: 8 });
  const lines = result.message.split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[1], /a_first\.mjs:1 function `t` CRAP 20/);
  assert.match(lines[2], /b_second\.mjs:1 function `t` CRAP 20/);
});

test("mutation gate passes when score meets threshold exactly", async (t) => {
  const dir = makeTempDir(t, "gnt-mutpass-");
  writeMutationReport(dir, 17);
  process.chdir(dir);
  const result = await runGatesAsync(["mutation"], { mutationReportPath: "reports/mutation/mutation.json", mutationScoreThreshold: 85 });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "mutation gates passed" });
});

test("mutation gate fails below threshold with violation text", async (t) => {
  const dir = makeTempDir(t, "gnt-mutfail-");
  writeMutationReport(dir, 4, 1);
  process.chdir(dir);
  const result = await runGatesAsync(["mutation"], { mutationReportPath: "reports/mutation/mutation.json", mutationScoreThreshold: 85 });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "mutation");
  assert.equal(
    result.message,
    "mutation score 80 is below the required 85 — kill more mutants by asserting on mutant behavior in your tests",
  );
});

test("corrupt mutation report surfaces as a setup error with exit 2", async (t) => {
  const dir = makeTempDir(t, "gnt-mutbad-");
  writeFileSync(path.join(dir, "broken.json"), "{not json");
  process.chdir(dir);
  const result = await runGatesAsync(["mutation"], { mutationReportPath: "broken.json", mutationScoreThreshold: 85 });
  assert.equal(result.status, 2);
  assert.equal(result.failedGate, null);
  assert.match(result.message, /^invalid mutation report at .*broken\.json/);
});
