import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const c8Bin = require.resolve("c8/bin/c8.js");
const forgeGateBin = path.join(packageRoot, "bin", "forge-gate.mjs");

const MATH_TS = `export interface Bounds {
  max: number;
}

export function trivial(a: number): number {
  return a + 1;
}

export function tangled(a: number, bounds: Bounds): number {
  if (a > bounds.max) {
    if (a > 2) {
      if (a > 3) return 1;
    }
  }
  return 0;
}
`;

const RUNNER_TS = `import { trivial } from "./math.ts";
console.log(trivial(1));
`;

test("end-to-end: c8 coverage over strip-types joins CRAP at original TS lines", (t) => {
  const dir = makeScratchProject(t);
  runC8(dir);
  const result = spawnGate(dir);
  assert.equal(result.status, 1, `expected gate failure, got:\n${result.stderr}${result.stdout}`);
  const err = result.stderr.toString();
  assert.match(err, /math\.ts:9/);
  assert.match(err, /tangled/);
  assert.match(err, /CRAP/);
  assert.doesNotMatch(err, /trivial/);
});

test("end-to-end: stale coverage warns on stderr without changing the exit code", (t) => {
  const dir = makeScratchProject(t);
  runC8(dir);
  const later = new Date(Date.now() + 5000);
  utimesSync(path.join(dir, "src", "math.ts"), later, later);
  const result = spawnGate(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr.toString(), /coverage data is older than your sources/);
});

test("end-to-end: covered TypeScript project passes the CRAP gate", (t) => {
  const dir = makeScratchProject(t, { exerciseAll: true });
  runC8(dir);
  const result = spawnGate(dir);
  assert.equal(result.status, 0, `expected pass, got:\n${result.stderr}${result.stdout}`);
});

function makeScratchProject(t, { exerciseAll = false } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-ts-e2e-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, "src"));
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "scratch", type: "module" }));
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({ roots: ["src"] }));
  writeFileSync(path.join(dir, "src", "math.ts"), MATH_TS);
  writeFileSync(
    path.join(dir, "runner.mjs"),
    exerciseAll
      ? 'import { trivial, tangled } from "./src/math.ts";\ntrivial(1);\ntangled(5, { max: 4 });\n'
      : 'import { trivial } from "./src/math.ts";\ntrivial(1);\n',
  );
  return dir;
}

function makeScratchEnv(dir) {
  // Nested coverage: Node force-propagates NODE_V8_COVERAGE to every spawned
  // descendant (deleting the var from env does not help), so gate/c8 children
  // would otherwise dump zero-count function data for forge-gate sources into
  // the OUTER test run's coverage directory, where it overwrites real hits
  // during c8's merge. Redirect descendants to a scratch-local directory.
  return { ...process.env, NODE_V8_COVERAGE: path.join(dir, ".v8-coverage") };
}

function runC8(dir) {
  const args = [
    c8Bin,
    "--reporter=json",
    "--clean",
    "node",
    "--experimental-strip-types",
    path.join(dir, "runner.mjs"),
  ];
  const result = spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8", timeout: 60000, env: makeScratchEnv(dir) });
  if (result.status !== 0) {
    throw new Error(`c8 failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
}

function spawnGate(dir) {
  return spawnSync(process.execPath, [forgeGateBin, "check", "--crap"], {
    cwd: dir,
    timeout: 60000,
    env: makeScratchEnv(dir),
  });
}
