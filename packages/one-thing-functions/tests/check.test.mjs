import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { checkProject } from "../src/check.mjs";

function tempProject(source) {
  const dir = mkdtempSync(path.join(tmpdir(), "otf-"));
  const file = path.join(dir, "sample.js");
  writeFileSync(file, source);
  return dir;
}

test("flags multi-arg function", () => {
  const root = tempProject("function add(a, b) { return a + b; }\n");
  const violations = checkProject({ roots: [root] });
  assert.equal(violations[0].message, "has 2 args");
});

test("flags long function", () => {
  const lines = Array.from({ length: 26 }, (_, index) => `  const x${index} = ${index};`).join("\n");
  const root = tempProject(`function longOne(input) {\n${lines}\n  return input;\n}\n`);
  const violations = checkProject({ roots: [root] });
  assert.equal(violations[0].message, "has 29 lines");
});

test("flags destructured bag in normal function", () => {
  const root = tempProject("function save({ host, token }) { return host + token; }\n");
  const violations = checkProject({ roots: [root] });
  assert.equal(violations[0].message, "uses destructured object bag");
});

test("allows factory object parameter", () => {
  const root = tempProject("function makeProfile({ host, token }) { return { host, token }; }\n");
  const violations = checkProject({ roots: [root] });
  assert.equal(violations.length, 0);
});
