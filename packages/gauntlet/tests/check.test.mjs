import test from "node:test";
import assert from "node:assert/strict";
import { runGatesAsync } from "../src/check.mjs";

test("spec gate passes when testCommand exits zero", async () => {
  const result = await runGatesAsync(["spec"], { testCommand: "true" });
  assert.equal(result.status, 0);
  assert.equal(result.failedGate, null);
});

test("spec gate fails when testCommand exits nonzero", async () => {
  const result = await runGatesAsync(["spec"], { testCommand: "false" });
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "spec");
});

test("missing qaCommand is a setup error", async () => {
  const result = await runGatesAsync(["qa"], { qaCommand: "" });
  assert.equal(result.status, 2);
  assert.match(result.message, /qaCommand/);
});

test("stops at first failing gate and follows canonical order", async () => {
  const result = await runGatesAsync(["qa", "spec"], { testCommand: "false", qaCommand: "true" });
  assert.equal(result.failedGate, "spec");
});
