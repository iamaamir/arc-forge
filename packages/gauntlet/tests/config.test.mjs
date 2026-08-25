import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { defaultConfig, loadConfigAsync } from "../src/config.mjs";

const cwd = process.cwd();

test("defaultConfig has Uncle Bob defaults", () => {
  assert.equal(defaultConfig.crapThreshold, 8);
  assert.equal(defaultConfig.mutationScoreThreshold, 85);
});

test("loadConfigAsync merges defaults without a config file", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cfg-"));
  t.after(() => process.chdir(cwd));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  process.chdir(dir);
  const config = await loadConfigAsync({ roots: ["lib"] });
  assert.equal(config.crapThreshold, 8);
  assert.deepEqual(config.roots, ["lib"]);
});

test("loadConfigAsync reads gauntlet.config.json overrides", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cfg-"));
  t.after(() => process.chdir(cwd));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(
    path.join(dir, "gauntlet.config.json"),
    JSON.stringify({ crapThreshold: 30, testCommand: "npm t" }),
  );
  process.chdir(dir);
  const config = await loadConfigAsync({});
  assert.equal(config.crapThreshold, 30);
  assert.equal(config.testCommand, "npm t");
  assert.equal(config.mutationScoreThreshold, 85);
});

test("options override config file values", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-cfg-"));
  t.after(() => process.chdir(cwd));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(
    path.join(dir, "gauntlet.config.json"),
    JSON.stringify({ crapThreshold: 30 }),
  );
  process.chdir(dir);
  const config = await loadConfigAsync({ crapThreshold: 12 });
  assert.equal(config.crapThreshold, 12);
});
