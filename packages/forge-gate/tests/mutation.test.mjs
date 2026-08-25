import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SetupError } from "../src/errors.mjs";
import { computeMutationScore, getMutationScore, mutationViolation } from "../src/mutation.mjs";

test("SetupError is named for easy filtering", () => {
  const error = new SetupError("boom");
  assert.ok(error instanceof Error);
  assert.equal(error.name, "SetupError");
  assert.equal(error.message, "boom");
});

test("getMutationScore computes score from stryker mutant statuses", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-mut-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const report = path.join(dir, "mutation.json");
  writeFileSync(report, JSON.stringify(strykerReport([["Killed", 3], ["Survived", 1]])));
  assert.equal(getMutationScore(report), 75);
});

function strykerReport(statuses) {
  const mutants = statuses.flatMap(([status, count]) =>
    Array.from({ length: count }, () => ({ status })),
  );
  return { schemaVersion: "1.0", files: { "src/a.mjs": { source: "", mutants } } };
}

test("timeouts count as detected; no coverage counts against the score", () => {
  const report = strykerReport([["Killed", 6], ["Timeout", 2], ["Survived", 1], ["NoCoverage", 1]]);
  assert.equal(computeMutationScore(report), 80);
});

test("compile errors and ignored mutants do not affect the score", () => {
  const report = strykerReport([["Killed", 8], ["CompileError", 2], ["Ignored", 90]]);
  assert.equal(computeMutationScore(report), 100);
});

test("an empty report scores zero rather than dividing by zero", () => {
  assert.equal(computeMutationScore({ files: {} }), 0);
});

test("entries without a mutants list do not distort the score", () => {
  const report = {
    files: {
      "src/a.mjs": { source: "" },
      "src/b.mjs": { source: "", mutants: [{ status: "Killed" }] },
    },
  };
  assert.equal(computeMutationScore(report), 100);
});

test("corrupt mutation report raises SetupError naming the file", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-mut-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const report = path.join(dir, "mutation.json");
  writeFileSync(report, "{bad json");
  assert.throws(
    () => getMutationScore(report),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, new RegExp(`^invalid mutation report at ${report.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      return true;
    },
  );
});

test("getMutationScore throws SetupError when report missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-mut-"));
  try {
    assert.throws(
      () => getMutationScore(path.join(dir, "missing.json")),
      (error) => {
        assert.ok(error instanceof SetupError);
        assert.match(error.message, /^no mutation report at /);
        assert.match(error.message, /npx stryker run/);
        assert.match(error.message, /reports: \["json"\]/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mutationViolation states score, threshold and remedy", () => {
  assert.equal(
    mutationViolation(60, 85),
    "mutation score 60 is below the required 85 — kill more mutants by asserting on mutant behavior in your tests",
  );
});
