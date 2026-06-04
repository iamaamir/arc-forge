import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(testDir, "../bin/one-thing-functions.mjs");

function tempFile(source) {
  const dir = mkdtempSync(path.join(tmpdir(), "otf-cli-"));
  const file = path.join(dir, "sample.js");
  writeFileSync(file, source);
  return dir;
}

test("check exits nonzero by default", () => {
  const root = tempFile("function add(a, b) { return a + b; }\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
});

test("check exits zero in advisory mode", () => {
  const root = tempFile("function add(a, b) { return a + b; }\n");
  execFileSync(process.execPath, [cli, "check", root, "--advisory"], { encoding: "utf8" });
});
