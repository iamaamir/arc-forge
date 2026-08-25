import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFunctions as analyzeSource } from "../src/complexity.mjs";

test("simple function has complexity 1", () => {
  const result = analyzeSource("function add(a, b) { return a + b; }\n");
  assert.equal(result[0].cc, 1);
  assert.equal(result[0].name, "add");
  assert.equal(result[0].line, 1);
});

test("branches increase complexity", () => {
  const source = `
function grade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  return score >= 70 ? "C" : "F";
}
`;
  const result = analyzeSource(source);
  assert.equal(result[0].cc, 4);
});

test("logical operators increase complexity", () => {
  const result = analyzeSource("const ok = (a, b) => (a && b) || c;\n");
  assert.equal(result[0].cc, 3);
});

test("arrow functions are named after their variable", () => {
  const result = analyzeSource("const handle = (x) => x ? x : null;\n");
  assert.equal(result[0].name, "handle");
  assert.equal(result[0].cc, 2);
});

test("nested functions counted separately", () => {
  const source = `
function outer(x) {
  if (x) return 1;
  const inner = (y) => y ? 2 : 3;
  return inner(x);
}
`;
  const fns = analyzeSource(source);
  const names = fns.map((fn) => fn.name).sort();
  assert.deepEqual(names, ["inner", "outer"]);
  assert.equal(fns.find((fn) => fn.name === "outer").cc, 2);
});

test("class methods are named; inner callbacks are not renamed", () => {
  const source = `
class Widget {
  render(x) {
    return x ? items.map((item) => item.id) : [];
  }
}
`;
  const result = analyzeSource(source);
  assert.deepEqual(result.map((fn) => fn.name).sort(), ["(anonymous)", "render"]);
});

test("declarators without initializers do not crash analysis", () => {
  const source = `
let pending;
function load(x) {
  if (x) pending = x;
  return pending;
}
`;
  const result = analyzeSource(source);
  assert.equal(result[0].name, "load");
  assert.equal(result[0].cc, 2);
});

test("every decision construct adds exactly one point", () => {
  const source = `
function everything(a) {
  for (let i = 0; i < 1; i++) a;
  for (const k in {}) a;
  for (const k of []) a;
  while (a) break;
  do { break } while (a);
  try { a(); } catch { }
  switch (a) { case 1: break; }
  return a ? 1 : 2;
}
`;
  const result = analyzeSource(source);
  assert.equal(result[0].cc, 9);
});

test("module syntax parses as ESM", () => {
  const result = analyzeSource('import fs from "node:fs";\nexport const load = (x) => x ?? null;\n');
  assert.equal(result[0].name, "load");
});

test("anonymous default export has a placeholder name", () => {
  const result = analyzeSource("export default function () { return 42; }\n");
  assert.deepEqual(result.map((fn) => fn.name), ["(anonymous)"]);
});

test("object properties name their function values", () => {
  const source = `
const handlers = {
  render: function draw() { return 1; },
  "on-event": function (e) { return e ? 1 : 2; },
};
`;
  const names = analyzeSource(source).map((fn) => fn.name).sort();
  assert.deepEqual(names, ["on-event", "render"]);
});

test("assignments rename arrow functions; member targets do not", () => {
  const source = `
let handler;
handler = (x) => x ? 1 : 2;
obj.member = (x) => x;
`;
  const named = analyzeSource(source);
  assert.deepEqual(named.map((fn) => fn.name).sort(), ["(anonymous)", "handler"]);
});

test("nested function decisions stay out of the parent count", () => {
  const source = `
function outer(x) {
  const inner = (y) => {
    if (y > 1) {
      while (y) break;
    }
    return y ? 1 : 2;
  };
  if (!x) return inner(2);
  return inner(1);
}
`;
  const fns = analyzeSource(source);
  assert.equal(fns.find((fn) => fn.name === "outer").cc, 2);
  assert.equal(fns.find((fn) => fn.name === "inner").cc, 4);
});
