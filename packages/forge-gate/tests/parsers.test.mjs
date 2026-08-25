import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { getParser } from "../src/parsers/index.mjs";
import { analyzeFunctions } from "../src/complexity.mjs";
import { SetupError } from "../src/errors.mjs";

const fixture = (name) =>
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "ts", name), "utf8");

test(".js/.mjs/.cjs dispatch to the JavaScript parser", () => {
  for (const ext of [".js", ".mjs", ".cjs"]) {
    const fns = analyzeFunctions("function add(a, b) { return a + b; }\n", ext);
    assert.equal(fns[0].name, "add");
    assert.equal(fns[0].line, 1);
  }
});

test(".ts/.mts/.cts dispatch to the TypeScript parser", () => {
  for (const ext of [".ts", ".mts", ".cts"]) {
    const fns = analyzeFunctions("function grade(a: number): number { return a > 1 ? 1 : 0; }\n", ext);
    assert.equal(fns[0].name, "grade");
    assert.equal(fns[0].cc, 2);
    assert.equal(fns[0].line, 1);
  }
});

test("unknown extensions are a clean setup error", () => {
  assert.throws(
    () => analyzeFunctions("x()", ".tsx"),
    (error) => error instanceof SetupError && /\.tsx/.test(error.message),
  );
});

test("TypeScript type annotations do not change complexity or positions", () => {
  const fns = analyzeFunctions(
    `function grade(score: number): string {\n  if (score >= 90) return "A";\n  if (score >= 80) return "B";\n  return score >= 70 ? "C" : "F";\n}\n`,
    ".ts",
  );
  assert.equal(fns[0].name, "grade");
  assert.equal(fns[0].cc, 4);
  assert.equal(fns[0].line, 1);
  assert.equal(fns[0].endLine, 5);
});

test("type-only declarations before code do not shift reported lines", () => {
  const source = `interface User {\n  id: number;\n}\n\ntype Score = number;\n\nexport function grade(score: Score): string {\n  return score >= 90 ? "A" : "B";\n}\n`;
  const fns = analyzeFunctions(source, ".ts");
  assert.deepEqual(fns.map((fn) => [fn.name, fn.line]), [["grade", 7]]);
});

test("multiline erased generics keep exact original lines", () => {
  const source = `function pick<T extends\n  Record<string, unknown>>(bag: T): T {\n  return bag ?? ({} as T);\n}\n`;
  const fns = analyzeFunctions(source, ".ts");
  assert.equal(fns[0].name, "pick");
  assert.equal(fns[0].line, 1);
  assert.equal(fns[0].endLine, 4);
});

test("enum followed by namespace then function rejects citing the construct", () => {
  const source = fixture("sample.ts");
  assert.throws(
    () => analyzeFunctions(source, { extension: ".ts", filename: "sample.ts" }),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /sample\.ts/);
      assert.match(error.message, /enum|namespace/i);
      return true;
    },
  );
});

test("parameter properties fail cleanly naming the syntax and file", () => {
  const source = `class Greeter {\n  constructor(private service: Logger, readonly id: number) {}\n}\n`;
  assert.throws(
    () => analyzeFunctions(source, { extension: ".ts", filename: "greeter.ts" }),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /parameter propert/i);
      assert.match(error.message, /greeter\.ts/);
      return true;
    },
  );
});

test("parameter properties are caught even when written across lines", () => {
  const source = `class A {\n  constructor(\n    public name: string,\n  ) {}\n}\n`;
  assert.throws(() => analyzeFunctions(source, ".ts"), /parameter propert/i);
});

test("decorators fail cleanly naming the syntax and file", () => {
  const source = `function d(t: any): any {\n  return t;\n}\n\n@d({\n  singleton: true,\n})\nclass Service {\n  @d\n  run(): void {}\n}\n`;
  assert.throws(
    () => analyzeFunctions(source, { extension: ".ts", filename: "service.ts" }),
    (error) => {
      assert.ok(error instanceof SetupError);
      assert.match(error.message, /decorator/i);
      assert.match(error.message, /service\.ts/);
      return true;
    },
  );
});

test("the @ symbol in ordinary code does not trigger the decorator rejection", () => {
  const fns = analyzeFunctions('const email = "a@b.com";\nexport function send(to: string): string {\n  return to;\n}\n', ".ts");
  assert.equal(fns[0].name, "send");
});

test("satisfies and as-cast expressions parse with correct positions", () => {
  const source = `const conf = {} satisfies Record<string, number>;\nexport const load = (x: unknown): unknown => {\n  return (x as { v?: number })?.v ?? 0;\n};\n`;
  const fns = analyzeFunctions(source, ".ts");
  assert.equal(fns[0].name, "load");
  assert.equal(fns[0].line, 2);
});

test("getParser exposes one parser per supported extension", () => {
  for (const ext of [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]) {
    assert.equal(typeof getParser(ext), "function");
  }
  assert.throws(() => getParser(".jsx"), SetupError);
});
