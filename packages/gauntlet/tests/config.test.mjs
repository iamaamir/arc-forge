import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { defaultConfig, loadConfigAsync } from "../src/config.mjs";
import { SetupError } from "../src/errors.mjs";

const cwd = process.cwd();

test("defaultConfig has Uncle Bob defaults", () => {
  assert.equal(defaultConfig.crapThreshold, 8);
  assert.equal(defaultConfig.mutationScoreThreshold, 85);
});

function withTempDir(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cfg-"));
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  return dir;
}

test("default config exposes every knob", async (t) => {
  withTempDir(t);
  const config = await loadConfigAsync({});
  assert.deepEqual(config.roots, ["src"]);
  assert.deepEqual(config.extensions, [".js", ".mjs", ".cjs", ".jsx"]);
  assert.equal(config.mutationReportPath, "reports/mutation/mutation.json");
  assert.equal(config.qaCommand, "");
});

test("loadConfigAsync merges defaults without a config file", async (t) => {
  withTempDir(t);
  const config = await loadConfigAsync({ roots: ["lib"] });
  assert.equal(config.crapThreshold, 8);
  assert.deepEqual(config.roots, ["lib"]);
});

test("null and undefined options fall back to defaults", async (t) => {
  withTempDir(t);
  const config = await loadConfigAsync({ roots: undefined, extensions: null });
  assert.deepEqual(config.roots, ["src"]);
  assert.deepEqual(config.extensions, [".js", ".mjs", ".cjs", ".jsx"]);
});

test("loadConfigAsync reads gauntlet.config.json overrides", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(
    path.join(dir, "gauntlet.config.json"),
    JSON.stringify({ crapThreshold: 30, testCommand: "npm t" }),
  );
  const config = await loadConfigAsync({});
  assert.equal(config.crapThreshold, 30);
  assert.equal(config.testCommand, "npm t");
  assert.equal(config.mutationScoreThreshold, 85);
});

test("options override config file values", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "gauntlet.config.json"), JSON.stringify({ crapThreshold: 30 }));
  const config = await loadConfigAsync({ crapThreshold: 12 });
  assert.equal(config.crapThreshold, 12);
});

test("malformed config json raises a descriptive SetupError", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "gauntlet.config.json"), "{oops");
  await assert.rejects(
    () => loadConfigAsync({}),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /^invalid gauntlet\.config\.json: /);
      return true;
    },
  );
});
