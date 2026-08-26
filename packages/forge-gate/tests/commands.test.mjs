import test from "node:test";
import assert from "node:assert/strict";
import { runCommand, toCommandResult } from "../src/commands.mjs";

test("toCommandResult combines stdout and stderr and trims", () => {
  const result = toCommandResult({ status: 3, stdout: "out\n", stderr: "err\n" });
  assert.deepEqual(result, { status: 3, output: "out\nerr" });
});

test("toCommandResult treats null status as failure 1", () => {
  assert.equal(toCommandResult({ status: null, stdout: "", stderr: "" }).status, 1);
});

test("toCommandResult keeps exit status 0 untouched", () => {
  assert.equal(toCommandResult({ status: 0, stdout: "", stderr: "" }).status, 0);
});

test("toCommandResult falls back to empty strings for missing streams", () => {
  assert.equal(toCommandResult({ status: 0 }).output, "");
  assert.equal(toCommandResult({ status: 0, stderr: "boom" }).output, "boom");
  assert.equal(toCommandResult({ status: 0, stdout: "hi" }).output, "hi");
});

test("runCommand captures exit code and merged output through a shell", () => {
  const result = runCommand(`node -e "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"`);
  assert.equal(result.status, 3);
  assert.equal(result.output, "outerr");
});

test("runCommand reports success for zero-exit commands", () => {
  const result = runCommand("echo forge-gate-ok");
  assert.equal(result.status, 0);
  assert.equal(result.output, "forge-gate-ok");
});

test("toCommandResult flags timed-out commands as failures", () => {
  const result = toCommandResult({ status: null, stdout: "", stderr: "", error: { code: "ETIMEDOUT" } }, 7);
  assert.deepEqual(result, { status: 1, output: "", error: { code: "ETIMEDOUT" }, truncated: false, timedOut: true, timeoutSeconds: 7 });
});

test("toCommandResult keeps normal results free of timeout fields", () => {
  assert.deepEqual(toCommandResult({ status: 3, stdout: "out", stderr: "err" }, 300), { status: 3, output: "outerr" });
});

test("runCommand kills a command that exceeds the configured timeout", () => {
  const result = runCommand("sleep 5", 1);
  assert.equal(result.timedOut, true);
  assert.equal(result.status, 1);
  assert.equal(result.timeoutSeconds, 1);
});

test("toCommandResult surfaces stream output alongside spawn errors", () => {
  const error = new Error("spawn failed");
  const result = toCommandResult({ error, stdout: "out", stderr: "err" }, 5);
  assert.deepEqual(result, {
    status: 1,
    output: "outerr",
    error,
    truncated: false,
    timedOut: false,
    timeoutSeconds: 5,
  });
});

test("toCommandResult tolerates missing streams on spawn errors", () => {
  const error = new Error("spawn failed");
  const result = toCommandResult({ error });
  assert.deepEqual(result, {
    status: 1,
    output: "",
    error,
    truncated: false,
    timedOut: false,
    timeoutSeconds: 300,
  });
});

test("toCommandResult marks only ETIMEDOUT errors as timeouts", () => {
  const result = toCommandResult({ error: { code: "ENOBUFS" }, stdout: "", stderr: "" }, 9);
  assert.equal(result.timedOut, false);
  assert.equal(result.timeoutSeconds, 9);
});

test("runCommand captures sub-maxBuffer chatty output without truncation", () => {
  const result = runCommand(`node -e "for (let i = 0; i < 2000; i++) process.stdout.write('x'.repeat(10)); process.exitCode = 1;"`);
  assert.equal(result.status, 1);
  assert.equal(result.truncated, undefined);
  assert.ok(!result.error, result.error?.message);
  assert.equal(result.output.length, 20000);
});

test("toCommandResult trims stream output around spawn errors too", () => {
  const error = new Error("spawn failed");
  const result = toCommandResult({ error, stdout: "\nout\n", stderr: "\nerr\n" });
  assert.equal(result.output, "out\n\nerr");
});

test("toCommandResult keeps captured output when the capture buffer is exceeded", () => {
  const result = toCommandResult({ status: null, stdout: "partial out", stderr: "partial err", error: { code: "ENOBUFS" } });
  assert.equal(result.status, 1);
  assert.equal(result.output, "partial outpartial err");
  assert.equal(result.truncated, true);
  assert.equal(result.timedOut, false);
});

test("toCommandResult does not mark ordinary errors as truncated", () => {
  const result = toCommandResult({ error: new Error("spawn failed"), stdout: "out", stderr: "" });
  assert.equal(result.truncated, false);
});
