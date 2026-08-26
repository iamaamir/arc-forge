import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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

function writeCoverageReport(dir, entries) {
  const files = {};
  for (const [fileName, covered] of Object.entries(entries)) {
    files[path.join(dir, "src", fileName)] = fakeCoverageFile(covered);
  }
  const coverageDir = path.join(dir, "coverage");
  mkdirSync(coverageDir, { recursive: true });
  writeFileSync(
    path.join(coverageDir, "coverage-final.json"),
    JSON.stringify(files),
  );
}

function fakeCoverageFile(covered) {
  const statementMap = {};
  const s = {};
  for (let i = 0; i < 8; i++) {
    statementMap[i] = { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: 1 } };
    s[i] = Number(i < covered);
  }
  return { statementMap, s };
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
  assert.equal(result.message, "testCommand failed:");
});

test("testCommand killed by timeout fails with an actionable message", async () => {
  const result = await runGatesAsync(["spec"], { testCommand: "sleep 5", commandTimeoutSeconds: 1 });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "spec");
  assert.match(result.message, /timed out after 1s/);
  assert.match(result.message, /commandTimeoutSeconds/);
});

test("timed-out command surfaces its partial output in the failure message", async () => {
  const result = await runGatesAsync(["spec"], {
    testCommand: `node -e "console.log('PARTIAL_TIMEOUT_MARKER'); setInterval(() => {}, 1000)"`,
    commandTimeoutSeconds: 1,
  });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "spec");
  assert.match(result.message, /timed out after 1s/);
  assert.match(result.message, /PARTIAL_TIMEOUT_MARKER/);
});

test("missing qaCommand is a setup error with actionable message", async () => {
  const result = await runGatesAsync(["qa"], { qaCommand: "" });
  assert.equal(result.status, 2);
  assert.equal(
    result.message,
    'qaCommand is not set. Add it to forge-gate.config.json, e.g. "qaCommand": "npm test".',
  );
});

test("stops at first failing gate and follows canonical order", async () => {
  const result = await runGatesAsync(["qa", "spec"], { testCommand: "false", qaCommand: "true" });
  assert.equal(result.failedGate, "spec");
});

test("gates run in canonical order regardless of request order", async () => {
  const result = await runGatesAsync(["qa", "mutation", "crap", "spec"], { testCommand: "false" });
  assert.equal(result.failedGate, "spec");
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
  writeCoverageReport(dir, { "tangled.js": 0 });
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
  writeCoverageReport(dir, { "a_first.mjs": 0, "b_second.mjs": 0 });
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

test("stale coverage emits a warning without changing the exit code", async (t) => {
  const dir = makeTempDir(t, "gnt-stale-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  writeFileSync(path.join(src, "clean.js"), "function fine(a) {\n  return a;\n}\n");
  writeCoverageReport(dir, { "clean.js": 1 });
  utimesSync(path.join(dir, "coverage", "coverage-final.json"), new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
  process.chdir(dir);
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["crap"], { roots: ["src"], crapThreshold: 8 });
  assert.equal(result.status, 0);
  assert.match(warnings.output, /warning: coverage data is older than your sources/);
});

test("fresh coverage does not emit a staleness warning", async (t) => {
  const dir = makeTempDir(t, "gnt-fresh-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  writeFileSync(path.join(src, "clean.js"), "function fine(a) {\n  return a;\n}\n");
  writeCoverageReport(dir, { "clean.js": 1 });
  process.chdir(dir);
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["crap"], { roots: ["src"], crapThreshold: 8 });
  assert.equal(result.status, 0);
  assert.equal(warnings.output, "");
});

test("default selection skips unconfigured deps gate with a stderr notice", async (t) => {
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["deps"], { testCommand: "true" }, { defaultSelection: true });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "no gates selected" });
  assert.match(
    warnings.output,
    /dependency rules not configured — some imports are ungated\. Run the forge-gate skill if available, or see https:\/\/github\.com\/iamaamir\/arc-forge#dependency-rules/,
  );
});

test("explicit deps selection still enforces configuration with no skip notice", async (t) => {
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["deps"], {});
  assert.equal(result.status, 2);
  assert.equal(warnings.output, "");
});

test("default selection skips unconfigured qa gate with a pinned stderr notice", async (t) => {
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["qa"], { qaCommand: "" }, { defaultSelection: true });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "no gates selected" });
  assert.match(warnings.output, /qaCommand not configured — QA gate skipped\. Add "qaCommand" to forge-gate\.config\.json to enforce it\./);
});

test("explicit qa selection still requires configuration with no skip notice", async (t) => {
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["qa"], { qaCommand: "" });
  assert.equal(result.status, 2);
  assert.equal(warnings.output, "");
});

test("default selection runs configured qa gate without a skip notice", async (t) => {
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["qa"], { qaCommand: "true" }, { defaultSelection: true });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "qa gates passed" });
  assert.equal(warnings.output, "");
});

function captureConsoleError(t) {
  const original = console.error;
  const captured = { output: "" };
  console.error = (...parts) => {
    captured.output += parts.join(" ");
  };
  t.after(() => {
    console.error = original;
  });
  return captured;
}

test("gateOrder returns a defensive copy of the canonical order", async () => {
  const { gateOrder } = await import("../src/check.mjs");
  const order = gateOrder();
  assert.deepEqual(order, ["deps", "spec", "crap", "mutation", "qa"]);
  order.push("tampered");
  assert.deepEqual(gateOrder(), ["deps", "spec", "crap", "mutation", "qa"]);
});

test("unexpected errors propagate instead of becoming setup failures", async () => {
  await assert.rejects(
    () =>
      runGatesAsync(["deps"], {
        dependencyRules: { rules: [{ from: "src/**", allow: [] }], unmatched: "allow" },
      }),
    TypeError,
  );
});

test("command killed by output overflow keeps captured output and flags truncation", async (t) => {
  const dir = makeTempDir(t, "gnt-enobufs-");
  process.chdir(dir);
  const result = await runGatesAsync(["spec"], {
    testCommand: `node -e "process.stdout.write('HEAD'); process.stdout.write('x'.repeat(11 * 1024 * 1024))"`,
  });
  assert.equal(result.status, 1);
  assert.match(result.message, /^testCommand failed:\nHEAD/);
  assert.match(result.message, /capture buffer and was truncated/);
});

test("multi-megabyte failure output is echoed head and tail only with a size-stating marker", async (t) => {
  const dir = makeTempDir(t, "gnt-echocap-");
  process.chdir(dir);
  const result = await runGatesAsync(["spec"], {
    testCommand:
      `node -e "process.stdout.write('HEADMARKER');` +
      ` for (let i = 0; i < 850; i++) process.stdout.write('x'.repeat(10000));` +
      ` process.stdout.write('TAILMARKER'); process.exitCode = 1;"`,
  });
  assert.equal(result.status, 1);
  assert.ok(Buffer.byteLength(result.message) < 32 * 1024, `message too large: ${Buffer.byteLength(result.message)} bytes`);
  assert.match(result.message, /^testCommand failed:\nHEADMARKER/);
  assert.match(result.message, /TAILMARKER$/);
  assert.match(result.message, /output truncated for display: \d+ bytes captured/);
  assert.match(result.message, /redirect your command's output to a file/);
});

test("command that cannot spawn reports the spawn error as could-not-run", async (t) => {
  const dir = makeTempDir(t, "gnt-e2big-");
  process.chdir(dir);
  const result = await runGatesAsync(["spec"], { testCommand: `echo ${"x".repeat(5_000_000)}` });
  assert.equal(result.status, 1);
  assert.match(result.message, /^testCommand could not run: .*E2BIG/);
});

test("coverage exactly as fresh as sources emits no staleness warning", async (t) => {
  const dir = makeTempDir(t, "gnt-equalmtime-");
  const src = path.join(dir, "src");
  mkdirSync(src);
  const sourcePath = path.join(src, "clean.js");
  writeFileSync(sourcePath, "function fine(a) {\n  return a;\n}\n");
  writeCoverageReport(dir, { "clean.js": 1 });
  const stamp = new Date(Date.now() - 30_000);
  utimesSync(sourcePath, stamp, stamp);
  utimesSync(path.join(dir, "coverage", "coverage-final.json"), stamp, stamp);
  process.chdir(dir);
  const warnings = captureConsoleError(t);
  const result = await runGatesAsync(["crap"], { roots: ["src"], crapThreshold: 8 });
  assert.equal(result.status, 0);
  assert.equal(warnings.output, "");
});

test("mutation gate passes when score equals the threshold exactly", async (t) => {
  const dir = makeTempDir(t, "gnt-muteq-");
  writeMutationReport(dir, 17, 3);
  process.chdir(dir);
  const result = await runGatesAsync(["mutation"], {
    mutationReportPath: "reports/mutation/mutation.json",
    mutationScoreThreshold: 85,
  });
  assert.deepEqual(result, { status: 0, failedGate: null, message: "mutation gates passed" });
});
