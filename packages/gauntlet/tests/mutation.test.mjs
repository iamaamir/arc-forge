import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { getMutationScore, mutationViolation } from "../src/mutation.mjs";
import { SetupError } from "../src/errors.mjs";

test("getMutationScore reads stryker json report", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-mut-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const report = path.join(dir, "mutation.json");
  writeFileSync(report, JSON.stringify({ schemaVersion: "1.0", mutationScore: 72.5 }));
  assert.equal(getMutationScore(report), 72.5);
});

test("getMutationScore throws SetupError when report missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-mut-"));
  try {
    assert.throws(() => getMutationScore(path.join(dir, "missing.json")), SetupError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mutationViolation describes shortfall", () => {
  const violation = mutationViolation(60, 85);
  assert.match(violation, /60/);
  assert.match(violation, /85/);
  assert.match(violation, /kill more mutants/i);
});
