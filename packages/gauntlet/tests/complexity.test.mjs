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
