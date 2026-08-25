import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { getParser } from "../src/parsers/index.mjs";
import { analyze as analyzeJavaScript } from "../src/parsers/javascript.mjs";
import { analyze as analyzeTypeScript } from "../src/parsers/typescript.mjs";
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

test("unknown extension error lists the exact supported set", () => {
  assert.throws(
    () => getParser(".jsx"),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        'no parser for extension ".jsx". Supported: .js, .mjs, .cjs, .ts, .mts, .cts. ' +
          ".jsx/.tsx are not supported.",
  );
});

test("declarator, member, method and assignment names are all picked up", () => {
  const fns = analyzeJavaScript(`
const arrow = () => 1;
const obj = {
  method() { return 2; },
  ["computed"]() { return 3; },
};
class Klass {
  runner() { return 4; }
}
let assigned;
assigned = function expr() { return 5; };
`);
  assert.deepEqual(
    fns.map((fn) => fn.name),
    ["arrow", "method", "computed", "runner", "assigned"],
  );
});

test("nested functions count only their own decision points", () => {
  const fns = analyzeJavaScript(
    "function outer(x) {\n  if (x > 1) {\n    const inner = (y) => (y > 2 ? 1 : 0);\n  }\n  return x > 3 ? 1 : 0;\n}\n",
  );
  assert.deepEqual(fns.map((fn) => [fn.name, fn.cc, fn.line]), [
    ["outer", 3, 1],
    ["inner", 2, 3],
  ]);
});

test("parameter properties are rejected with the exact message (single line)", () => {
  assert.throws(
    () => analyzeTypeScript("class G {\n  constructor(private service: Logger) {}\n}\n", { filename: "greeter.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        'greeter.ts: TypeScript parameter properties (e.g. "constructor(private service)") are not supported — ' +
          "declare constructor parameters explicitly and assign them in the body",
  );
});

test("parameter properties are rejected with the exact message (zero space)", () => {
  assert.throws(
    () => analyzeTypeScript("class G {\n  constructor(private a: T) {}\n}\n", { filename: "g.ts" }),
    (error) =>
      error instanceof SetupError && error.message.startsWith("g.ts: TypeScript parameter properties"),
  );
});

test("parameter properties use the default input label when unnamed", () => {
  assert.throws(
    () => analyzeTypeScript("class G {\n  constructor(readonly id: number) {}\n}\n"),
    (error) =>
      error instanceof SetupError && error.message.startsWith("input: TypeScript parameter properties"),
  );
});

test("multiline parameter properties are rejected with the exact message", () => {
  const source = "class A {\n  constructor(\n    public name: string,\n  ) {}\n}\n";
  assert.throws(
    () => analyzeTypeScript(source, { filename: "a.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        'a.ts: TypeScript parameter properties (e.g. "constructor(private service)") are not supported — ' +
          "declare constructor parameters explicitly and assign them in the body",
  );
});

test("decorators are rejected with the exact message", () => {
  const source = "function d(t: any): any {\n  return t;\n}\n\n@d({\n  singleton: true,\n})\nclass Service {\n  @d\n  run(): void {}\n}\n";
  assert.throws(
    () => analyzeTypeScript(source, { filename: "service.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        "service.ts: decorators (@) are not supported — remove them or exclude the file via roots/extensions",
  );
});

test("an at-sign ending a template literal line is not a decorator", () => {
  const source = "const c = `a@\nb`;\nexport function f(): number {\n  return 1;\n}\n";
  const fns = analyzeTypeScript(source);
  assert.equal(fns[0].name, "f");
});

test("a bare annotation-looking line is rejected as a decorator", () => {
  assert.throws(
    () => analyzeTypeScript("\n@foo\nexport function f(): number {\n  return 1;\n}\n", { filename: "b.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        "b.ts: decorators (@) are not supported — remove them or exclude the file via roots/extensions",
  );
});

test("amaro transform failures surface with the exact prefix", () => {
  const prefix = "cannot parse TypeScript in bad.ts: ";
  const beyondPrefix = (message) =>
    message.startsWith(prefix) && message.length > prefix.length + 1;
  assert.throws(
    () => analyzeTypeScript("const x: = 3;\n", { filename: "bad.ts" }),
    (error) => error instanceof SetupError && beyondPrefix(error.message),
  );
});

test("non-erasable constructs name the construct and remedy exactly", () => {
  assert.throws(
    () => analyzeFunctions(fixture("sample.ts"), { extension: ".ts", filename: "sample.ts" }),
    (error) =>
      error instanceof SetupError &&
      /^sample\.ts: .+ — this non-erasable construct cannot be scored for CRAP because lowering it shifts line numbers$/.test(
        error.message,
      ),
  );
});

test("parameter properties detected with space before the constructor paren", () => {
  assert.throws(
    () => analyzeTypeScript("class G {\n  constructor (private a: T) {}\n}\n", { filename: "g.ts" }),
    (error) =>
      error instanceof SetupError && error.message.startsWith("g.ts: TypeScript parameter properties"),
  );
});

test("parameter properties detected with space after the constructor paren", () => {
  assert.throws(
    () => analyzeTypeScript("class G {\n  constructor( private a: T) {}\n}\n", { filename: "g.ts" }),
    (error) =>
      error instanceof SetupError && error.message.startsWith("g.ts: TypeScript parameter properties"),
  );
});

test("column-zero decorators are rejected with the exact message", () => {
  const source = "function d(t: any): any {\n  return t;\n}\n\n@d({singleton: true})\nclass Service {\nrun(): void {}\n}\n";
  assert.throws(
    () => analyzeTypeScript(source, { filename: "service.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        "service.ts: decorators (@) are not supported — remove them or exclude the file via roots/extensions",
  );
});

test("indented-only decorators are rejected with the exact message", () => {
  const source = "function d(t: any): any {\n  return t;\n}\n\nclass Service {\n  @d\n  run(): void {}\n}\n";
  assert.throws(
    () => analyzeTypeScript(source, { filename: "service.ts" }),
    (error) =>
      error instanceof SetupError &&
      error.message ===
        "service.ts: decorators (@) are not supported — remove them or exclude the file via roots/extensions",
  );
});

test("at-signs inside trailing comments never trigger decorator rejection", () => {
  const ok = 'export const k = 1; // mail user@home\nexport function f(): number {\n  return 1;\n}\n';
  assert.equal(analyzeTypeScript(ok)[0].name, "f");
  const dashy = '// tag@w-\nexport function g(): number {\n  return 2;\n}\n';
  assert.equal(analyzeTypeScript(dashy)[0].name, "g");
});
