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
  assert.equal(defaultConfig.mutationScoreThreshold, 95);
  assert.equal(defaultConfig.commandTimeoutSeconds, 300);
});

test("profile is the single source of truth for defaults", async () => {
  const { default: profile } = await import("../profiles/default.mjs");
  assert.equal(profile.profile, "default");
  assert.deepEqual(defaultConfig, profile);
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
  assert.deepEqual(config.extensions, [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);
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
  assert.deepEqual(config.extensions, [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);
});

test("loadConfigAsync reads forge-gate.config.json overrides", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(
    path.join(dir, "forge-gate.config.json"),
    JSON.stringify({ crapThreshold: 30, testCommand: "npm t" }),
  );
  const config = await loadConfigAsync({});
  assert.equal(config.crapThreshold, 30);
  assert.equal(config.testCommand, "npm t");
  assert.equal(config.mutationScoreThreshold, 95);
});

test("options override config file values", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ crapThreshold: 30 }));
  const config = await loadConfigAsync({ crapThreshold: 12 });
  assert.equal(config.crapThreshold, 12);
});

test("malformed config json raises a descriptive SetupError", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), "{oops");
  await assert.rejects(
    () => loadConfigAsync({}),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /^invalid forge-gate\.config\.json: /);
      return true;
    },
  );
});

test("null roots in config raise a descriptive SetupError", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ roots: null }));
  await assert.rejects(() => loadConfigAsync({}), /roots must be an array of directories/);
});

test("string roots in config raise a descriptive SetupError", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ roots: "src" }));
  await assert.rejects(
    () => loadConfigAsync({}),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /roots must be an array of directories/);
      return true;
    },
  );
});

test("non-string roots entries are rejected", async () => {
  await assert.rejects(() => loadConfigAsync({ roots: [42] }), /roots must be an array of directories/);
});

test("null dependencyRules is a setup error naming the key", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ dependencyRules: null }));
  await assert.rejects(
    () => loadConfigAsync({}),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /dependencyRules must be an object/);
      return true;
    },
  );
});

test("non-object dependencyRules values are setup errors", async () => {
  await assert.rejects(() => loadConfigAsync({ dependencyRules: "src/**" }), /dependencyRules must be an object/);
  await assert.rejects(() => loadConfigAsync({ dependencyRules: 42 }), /dependencyRules must be an object/);
});

for (const key of ["crapThreshold", "mutationScoreThreshold", "commandTimeoutSeconds"]) {
  test(`non-numeric ${key} config value is a setup error`, async (t) => {
    const dir = withTempDir(t);
    writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ [key]: "abc" }));
    await assert.rejects(
      () => loadConfigAsync({}),
      (error) => {
        assert.ok(error instanceof SetupError);
        assert.match(error.message, new RegExp(`${key} must be a finite number`));
        return true;
      },
    );
  });

  test(`non-finite ${key} config value is a setup error`, async () => {
    await assert.rejects(() => loadConfigAsync({ [key]: Infinity }), new RegExp(`${key} must be a finite number`));
  });
}

test("commandTimeoutSeconds of zero is rejected with exit-2 semantics", async (t) => {
  const dir = withTempDir(t);
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ commandTimeoutSeconds: 0 }));
  await assert.rejects(
    () => loadConfigAsync({}),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /commandTimeoutSeconds must be greater than zero/);
      return true;
    },
  );
});

test("negative commandTimeoutSeconds is rejected", async () => {
  await assert.rejects(() => loadConfigAsync({ commandTimeoutSeconds: -5 }), /commandTimeoutSeconds must be greater than zero/);
});
