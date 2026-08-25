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
  assert.deepEqual(result, { status: 1, output: "", error: { code: "ETIMEDOUT" }, timedOut: true, timeoutSeconds: 7 });
});

test("toCommandResult keeps normal results free of timeout fields", () => {
  const result = toCommandResult({ status: 3, stdout: "out", stderr: "err" }, 300);
  assert.deepEqual(result, { status: 3, output: "outerr" });
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
    timedOut: false,
    timeoutSeconds: 300,
  });
});

test("toCommandResult marks only ETIMEDOUT errors as timeouts", () => {
  const result = toCommandResult({ error: { code: "ENOBUFS" }, stdout: "", stderr: "" }, 9);
  assert.equal(result.timedOut, false);
  assert.equal(result.timeoutSeconds, 9);
});
