import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { listFiles } from "../src/filelist.mjs";

function makeProject(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-fl-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, "src");
  mkdirSync(src);
  return dir;
}

test("lists matching files under roots with absolute paths", (t) => {
  const dir = makeProject(t);
  const nested = path.join(dir, "src", "deep");
  mkdirSync(nested);
  writeFileSync(path.join(nested, "good.mjs"), "");
  const files = listFiles({ roots: [path.join(dir, "src")], extensions: [".mjs"] });
  assert.deepEqual(files, [path.join(nested, "good.mjs")]);
});

test("skips files whose extension is not enabled", (t) => {
  const dir = makeProject(t);
  writeFileSync(path.join(dir, "src", "notes.txt"), "");
  writeFileSync(path.join(dir, "src", "code.js"), "");
  const files = listFiles({ roots: [path.join(dir, "src")], extensions: [".js"] });
  assert.deepEqual(files, [path.join(dir, "src", "code.js")]);
});

test("missing roots yield nothing instead of crashing", () => {
  const files = listFiles({ roots: ["definitely-not-here"], extensions: [".js"] });
  assert.deepEqual(files, []);
});

test("falls back to default extensions when unset", (t) => {
  const dir = makeProject(t);
  writeFileSync(path.join(dir, "src", "plain.cjs"), "");
  const files = listFiles({ roots: [path.join(dir, "src")], extensions: undefined });
  assert.deepEqual(files, [path.join(dir, "src", "plain.cjs")]);
});
