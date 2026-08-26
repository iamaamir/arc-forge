import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";
import { runGatesAsync } from "../src/check.mjs";
import { loadConfigAsync } from "../src/config.mjs";

const cwd = process.cwd();

function makeProject(t, files, config = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-"));
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  const merged = {
    roots: [...new Set(Object.keys(files).map((relPath) => relPath.split("/")[0]))],
    ...config,
  };
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  return { dir, config: merged };
}

async function runDeps(t, files, config) {
  const { config: merged } = makeProject(t, files, config);
  return runGatesAsync(["deps"], await loadConfigAsync(merged));
}

const RULES = (rules, extra = {}) => ({ dependencyRules: { rules, unmatched: "allow", ...extra } });

function assertExactOrPrefix(result, config, expected) {
  assert.equal(result.status, 2, JSON.stringify(config));
  if (expected.endsWith(": ")) {
    assert.match(result.message, new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    return;
  }
  assert.equal(result.message, expected, JSON.stringify(config));
}

test("single violation produces the exact four-line report", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/app.js": 'import e from "./lib/evil.js";\n',
      "src/lib/evil.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/lib/evil.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      "  src/app.js -> src/lib/evil.js (violates rule 1) — remove the import or update dependencyRules\n" +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("plural summary counts violations and files exactly", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/busy.js": 'import a from "./f1.js";\nimport b from "./f2.js";\n',
      "src/quiet.js": 'import a from "./f1.js";\n',
      "src/f1.js": "export default 1;\n",
      "src/f2.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/f1.js", "src/f2.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.ok(result.message.includes("\n3 violations across 2 files\n"), result.message);
});

test("violations sort heaviest file first regardless of scan order", async (t) => {
  const result = await runDeps(
    t,
    {
      "aroot/a.js": 'import a from "./f1.js";\n',
      "aroot/f1.js": "export default 1;\n",
      "zroot/z.js": 'import a from "./f1.js";\nimport b from "./f2.js";\n',
      "zroot/f1.js": "export default 1;\n",
      "zroot/f2.js": "export default 1;\n",
    },
    {
      roots: ["aroot", "zroot"],
      ...RULES([{ from: "**/*.js", allow: [], forbid: ["**/f1.js", "**/f2.js"] }]),
    },
  );
  assert.equal(result.status, 1);
  const zIndex = result.message.indexOf("zroot/z.js");
  const aIndex = result.message.indexOf("aroot/a.js");
  assert.ok(zIndex !== -1 && aIndex !== -1);
  assert.ok(zIndex < aIndex, `heaviest file first even when it sorts last alphabetically:\n${result.message}`);
});

test("equal-weight violations sort alphabetically across many files", async (t) => {
  const files = {};
  const roots = [];
  for (const name of ["d", "c", "b", "a"]) {
    roots.push(`${name}root`);
    files[`${name}root/${name}.js`] = 'import x from "./f1.js";\n';
    files[`${name}root/f1.js`] = "export default 1;\n";
  }
  const result = await runDeps(
    t,
    files,
    { roots, ...RULES([{ from: "**/*.js", allow: [], forbid: ["**/f1.js"] }]) },
  );
  assert.equal(result.status, 1);
  const order = ["a", "b", "c", "d"].map((name) => result.message.indexOf(`${name}root/${name}.js`));
  assert.ok(order.every((index) => index !== -1), result.message);
  assert.deepEqual(order, [...order].sort((x, y) => x - y), `alphabetical order expected:\n${result.message}`);
});

test("equal-weight violations sort alphabetically regardless of scan order", async (t) => {
  const result = await runDeps(
    t,
    {
      "zroot/z.js": 'import a from "./f1.js";\n',
      "zroot/f1.js": "export default 1;\n",
      "aroot/a.js": 'import b from "./f1.js";\n',
      "aroot/f1.js": "export default 1;\n",
    },
    {
      roots: ["zroot", "aroot"],
      ...RULES([{ from: "**/*.js", allow: [], forbid: ["**/f1.js"] }]),
    },
  );
  assert.equal(result.status, 1);
  const aIndex = result.message.indexOf("aroot/a.js");
  const zIndex = result.message.indexOf("zroot/z.js");
  assert.ok(aIndex !== -1 && zIndex !== -1);
  assert.ok(aIndex < zIndex, `alphabetical tie-break:\n${result.message}`);
});

test("unresolved import produces the exact remedy text", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import x from "./missing.js";\n' },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      '  src/a.js imports "./missing.js" which cannot be resolved — fix or remove the broken import\n' +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("escaping import produces the exact escape remedy text", async (t) => {
  const result = await runDeps(
    t,
    { "proj/src/a.js": 'import x from "../../../outside.js";\n' },
    RULES([{ from: "proj/src/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.match(
    result.message,
    /which resolves outside the repository — remove the import/,
  );
  assert.doesNotMatch(result.message, /cannot be resolved/);
});

test("external module denied produces the exact message", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import p from "picomatch";\n' },
    RULES([{ from: "src/**", allow: [] }], { allowNodeModules: false }),
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      "  src/a.js -> picomatch (external module denied by allowNodeModules) — allow it explicitly or drop the dependency\n" +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("unmatched policy defaults to deny with exact message", async (t) => {
  const result = await runDeps(
    t,
    { "orphan/a.js": "export default 1;\n" },
    { dependencyRules: { rules: [{ from: "src/**", allow: [] }] } },
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      '  orphan/a.js matches no dependencyRules.from pattern (unmatched: "deny") — add a rule covering it or set unmatched to "allow"\n' +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("unmatched policy allow reports nothing for unmatched files", async (t) => {
  const result = await runDeps(
    t,
    { "orphan/a.js": "export default 1;\n" },
    RULES([{ from: "src/**", allow: [] }], { unmatched: "allow" }),
  );
  assert.equal(result.status, 0);
  assert.equal(result.message, "deps gates passed");
});

test("external modules are allowed when allowNodeModules is unset", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import fs from "node:fs";\nimport p from "picomatch";\n' },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("extension resolution falls back to defaults without configured extensions", async (t) => {
  const { config } = makeProject(t, {
    "src/a.js": 'import b from "./b";\n',
    "src/b.cjs": "module.exports = 1;\n",
  }, {
    dependencyRules: { rules: [{ from: "src/**", allow: [], forbid: ["src/b.cjs"] }], unmatched: "allow" },
  });
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.match(result.message, /-> src\/b\.cjs \(violates rule 1\)/);
});

test("TypeScript sources are transformed before import extraction", async (t) => {
  for (const ext of [".ts", ".mts", ".cts"]) {
    const importer = `src/a${ext}`;
    const result = await runDeps(
      t,
      {
        [importer]: 'import helper from "./helper.js";\nexport const n: number = 1;\n',
        "src/helper.js": "export default 1;\n",
      },
      RULES([{ from: "src/**", allow: [], forbid: ["src/helper.js"] }]),
    );
    assert.equal(result.status, 1, `${ext}: ${result.message}`);
    assert.match(result.message, new RegExp(`src/a${ext.replace(".", "\\.")} -> src/helper\\.js`));
  }
});

test("export-all declarations participate", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/barrel.js": 'export * from "./secret.js";\n',
      "src/secret.js": "export const ok = () => 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/secret.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/barrel\.js -> src\/secret\.js/);
});

test("glob rules match dotted directories", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a.js": 'import s from "./.config/secret.js";\n',
      "src/.config/secret.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/.config/**"] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      "  src/a.js -> src/.config/secret.js (violates rule 1) — remove the import or update dependencyRules\n" +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("plain calls and new-expressions are not treated as require", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a.cjs": 'loader("./secret.js");\nconst s = new Shim("./secret.js");\nconst r = new require("./secret.js");\nmodule.exports = r;\n',
      "src/secret.js": "export default 1;\n",
    },
    RULES([{ from: "**/*.cjs", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("from-globs reach importers inside dotted directories", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/.config/cli.js": 'import s from "../secret.js";\n',
      "src/secret.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/secret.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/\.config\/cli\.js -> src\/secret\.js \(violates rule 1\)/);
});

test("non-literal require arguments are ignored", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a.cjs": "require(42);\nconst m = require(someVar);\nmodule.exports = m;\n",
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("neither-allowed-nor-forbidden message is exact", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/cli/run.js": 'import x from "../util/helper.js";\n',
      "src/util/helper.js": "export default 1;\n",
    },
    RULES([{ from: "src/cli/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      "  src/cli/run.js -> src/util/helper.js (violates rule 1) — target is neither allowed nor forbidden by rule 1; add an explicit allow or forbid\n" +
      "1 violation across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("self-root relative import is reported as escaping", async (t) => {
  const result = await runDeps(
    t,
    { "a.js": 'import x from ".";\n' },
    {
      roots: ["."],
      ...RULES([{ from: "**/*.js", allow: [] }]),
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /^DEPS gate failed:\n {2}a\.js imports "\." which resolves outside the repository — remove the import\n/);
});

test("imports exact string targets participate", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","type":"module","imports":{"#core":"./src/core/index.js"}}\n',
      "src/cli/run.js": 'import x from "#core";\n',
      "src/core/index.js": "export default 1;\n",
    },
    RULES([{ from: "src/cli/**", allow: [], forbid: ["src/core/**"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/cli\/run\.js -> src\/core\/index\.js \(violates rule 1\)/);
});

test("array and numeric imports targets stay external", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{"#a":["./x.js"],"#b":42}}\n',
      "src/a.js": 'import x from "#a";\nimport y from "#b";\n',
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("null imports field is ignored", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":null}\n',
      "src/a.js": 'import x from "#a";\n',
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("pattern imports target without a * placeholder stays external", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{"#lib/*":"./static/vendor.js"}}\n',
      "src/static/vendor.js": "export default 1;\n",
      "src/a.js": 'import x from "#lib/thing";\n',
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/static/**"] }]),
  );
  assert.equal(result.status, 0);
});

test("pattern keys must end with * before matching", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{"#ab":"./src/bad/*.js","#a/*":"./src/good/*.js"}}\n',
      "src/good/c.js": "export default 1;\n",
      "src/a.js": 'import x from "#abc";\n',
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/good/**"] }]),
  );
  assert.equal(result.status, 0, result.message);
});

test("prefix matching requires the full key prefix without the star", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{"#ab":"./src/bad/*.js","#a/*":"./src/good/*.js"}}\n',
      "src/good/c.js": "export default 1;\n",
      "src/a.js": 'import x from "#abq";\n',
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0, result.message);
});

test("star substitution uses only the matched key's prefix", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{"#x/*":"./src/x/*.js"}}\n',
      "src/a.js": 'import x from "#yq";\n',
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/x/**"] }]),
  );
  assert.equal(result.status, 0, result.message);
});

test("workspace package entry honours package.json main exactly", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-ws-"));
  const files = {
    "lib/withmain/package.json": '{"name":"withmain","main":"entry.js"}\n',
    "lib/withmain/entry.js": "export default 1;\n",
    "lib/withdir/index.js": "export default 1;\n",
    "src/main.js": 'import a from "withmain";\nimport b from "withdir";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  symlinkSync(path.join(dir, "lib", "withmain"), path.join(dir, "node_modules", "withmain"), "dir");
  symlinkSync(path.join(dir, "lib", "withdir"), path.join(dir, "node_modules", "withdir"), "dir");
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync(RULES([
    { from: "src/**", allow: [], forbid: ["lib/withmain/entry.js", "lib/withdir/index.js"] },
  ]));
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.equal(
    result.message,
    "DEPS gate failed:\n" +
      "  src/main.js -> lib/withmain/entry.js (violates rule 1) — remove the import or update dependencyRules\n" +
      "  src/main.js -> lib/withdir/index.js (violates rule 1) — remove the import or update dependencyRules\n" +
      "2 violations across 1 file\n" +
      "Fix the imports or renegotiate the rules — run the forge-rules skill if available, or see https://github.com/iamaamir/arc-forge#dependency-rules",
  );
});

test("scoped bare specifiers resolve through the @scope/name package", async (t) => {
  const result = await runDeps(
    t,
    {
      "lib/scoped/package.json": '{"name":"@scope/pkg","main":"index.js"}\n',
      "lib/scoped/index.js": "export default 1;\n",
      "src/main.js": 'import p from "@scope/pkg";\n',
    },
    RULES([{ from: "src/**", allow: [], forbid: ["lib/**"] }]),
  );
  // Without a node_modules link this is simply external; create the workspace link.
  assert.equal(result.status, 0, "precondition: no link means external");
});

test("scoped workspace specifier is classified by its @scope/name package", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-scope-"));
  const files = {
    "lib/scoped/package.json": '{"name":"@scope/pkg","main":"index.js"}\n',
    "lib/scoped/index.js": "export default 1;\n",
    "src/main.js": 'import p from "@scope/pkg";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  mkdirSync(path.join(dir, "node_modules", "@scope"), { recursive: true });
  symlinkSync(path.join(dir, "lib", "scoped"), path.join(dir, "node_modules", "@scope", "pkg"), "dir");
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync(RULES([{ from: "src/**", allow: [], forbid: ["lib/**"] }]));
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/main\.js -> lib\/scoped\/index\.js \(violates rule 1\)/);
});

test("deep unscoped specifier maps to its first path segment", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-deep-"));
  const files = {
    "lib/deep/package.json": '{"name":"deep","main":"index.js"}\n',
    "lib/deep/index.js": "export default 1;\n",
    "src/main.js": 'import u from "deep/util";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  symlinkSync(path.join(dir, "lib", "deep"), path.join(dir, "node_modules", "deep"), "dir");
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync(RULES([{ from: "src/**", allow: [], forbid: ["lib/**"] }]));
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/main\.js -> lib\/deep.*violates rule 1/);
});

test("allowNodeModules globs can match the resolved node_modules path", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-nm-"));
  const files = {
    "node_modules/fakepkg/package.json": '{"name":"fakepkg","main":"index.js"}\n',
    "node_modules/fakepkg/index.js": "module.exports = 1;\n",
    "node_modules/otherpkg/package.json": '{"name":"otherpkg","main":"index.js"}\n',
    "node_modules/otherpkg/index.js": "module.exports = 1;\n",
    "src/a.js": 'import f from "fakepkg";\nimport o from "otherpkg";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync({
    roots: ["src"],
    ...RULES([{ from: "src/**", allow: [] }], { allowNodeModules: ["node_modules/fakepkg/**"] }),
  });
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.message, /fakepkg/);
  assert.match(result.message, /otherpkg \(external module denied by allowNodeModules\)/);
});

test("sibling-directory installs stay external even with shared path prefixes", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-sib-"));
  const realRoot = realpathSync(dir);
  const sibling = `${realRoot}-sib`;
  mkdirSync(path.join(sibling, "lib"), { recursive: true });
  writeFileSync(path.join(sibling, "lib", "package.json"), '{"name":"outsider","main":"index.js"}\n');
  writeFileSync(path.join(sibling, "lib", "index.js"), "module.exports = 1;\n");
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  symlinkSync(path.join(sibling, "lib"), path.join(dir, "node_modules", "outsider"), "dir");
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src", "a.js"), 'import o from "outsider";\n');
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    rmSync(sibling, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync(RULES([{ from: "src/**", allow: [] }]));
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 0, result.message);
});

test("unparseable source is a setup error naming the file", async (t) => {
  const result = await runDeps(t, { "src/bad.js": "this is not ((( valid javascript\n" }, RULES([{ from: "src/**", allow: [] }]));
  assert.equal(result.status, 2);
  assert.match(result.message, /^cannot parse src\/bad\.js: Unexpected token \(1:5\)$/);
});

test("rule validation errors cite exact rule numbers and fields", async (t) => {
  const cases = [
    [{ dependencyRules: { rules: [{ from: "src/**" }, "nope"], unmatched: "allow" } },
      'dependencyRules rule 2 must be an object with "from", "allow", "forbid"'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, []], unmatched: "allow" } },
      'dependencyRules rule 2 must be an object with "from", "allow", "forbid"'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, null], unmatched: "allow" } },
      'dependencyRules rule 2 must be an object with "from", "allow", "forbid"'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { allow: [] }], unmatched: "allow" } },
      'dependencyRules rule 2 is missing "from" — every rule needs a from glob'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { from: "   ", allow: [] }], unmatched: "allow" } },
      'dependencyRules rule 2 is missing "from" — every rule needs a from glob'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { from: "", allow: [] }], unmatched: "allow" } },
      'dependencyRules rule 2 is missing "from" — every rule needs a from glob'],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { from: "ok", allow: "x" }], unmatched: "allow" } },
      "dependencyRules rule 2 allow must be an array of glob strings"],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { from: "ok", forbid: [{}] }], unmatched: "allow" } },
      "dependencyRules rule 2 forbid must be an array of glob strings"],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: [] }], unmatched: "deny", allowNodeModules: ["ok", 42] } },
      "dependencyRules.allowNodeModules must be true, false, or an array of glob strings"],
    [{ dependencyRules: { rules: [{ from: "src/**" }, { from: "ok", allow: [""] }], unmatched: "allow" } },
      'invalid glob "" in dependencyRules (rule 2 allow) — patterns must be non-empty strings'],
  ];
  for (const [config, expected] of cases) {
    const result = await runDeps(t, { "src/a.js": "export default 1;\n" }, config);
    assertExactOrPrefix(result, config, expected);
  }
});

test("empty rules with deny produce the exact guidance message", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": "export default 1;\n" },
    { dependencyRules: { rules: [], unmatched: "deny" } },
  );
  assert.equal(result.status, 2);
  assert.equal(
    result.message,
    'dependencyRules: "rules": [] combined with unmatched "deny" denies every scanned file — add rules or set unmatched to "allow"',
  );
});

test("any matching allowNodeModules pattern is sufficient", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-depsh-any-"));
  const files = {
    "node_modules/fakepkg/package.json": '{"name":"fakepkg","main":"index.js"}\n',
    "node_modules/fakepkg/index.js": "module.exports = 1;\n",
    "node_modules/otherpkg/package.json": '{"name":"otherpkg","main":"index.js"}\n',
    "node_modules/otherpkg/index.js": "module.exports = 1;\n",
    "src/a.js": 'import f from "fakepkg";\nimport o from "otherpkg";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync({
    roots: ["src"],
    ...RULES([{ from: "src/**", allow: [] }], { allowNodeModules: ["fakepkg", "otherpkg"] }),
  });
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 0, result.message);
});

test("empty-string entry in allowNodeModules is rejected up front", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import p from "picomatch";\n' },
    RULES([{ from: "src/**", allow: [] }], { allowNodeModules: [""] }),
  );
  assert.equal(result.status, 2);
  assert.equal(
    result.message,
    'invalid glob "" in dependencyRules (allowNodeModules) — patterns must be non-empty strings',
  );
});

test("subpath imports degrade to external without any package.json up-tree", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import x from "#private/thing";\n' },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0, result.message);
});

test("subpath import with no imports field in the nearest package.json degrades to external", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","type":"module"}\n',
      "src/a.js": 'import x from "#private/thing";\n',
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0, result.message);
});

test("array-valued pattern-import targets degrade to external (documented non-goal)", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","type":"module","imports":{"#z/*":["./src/*.js"]}}\n',
      "src/a.js": 'import x from "#z/thing";\n',
      "src/thing.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0, result.message);
});


test("missing dependencyRules produces the exact guidance message", async (t) => {
  const result = await runDeps(t, { "src/a.js": "export default 1;\n" }, {});
  assert.equal(result.status, 2);
  assert.equal(
    result.message,
    "dependencyRules is not configured — negotiate rules with your team by running the forge-rules skill " +
      "if available (otherwise see https://github.com/iamaamir/arc-forge#dependency-rules), " +
      "then add them to forge-gate.config.json",
  );
});
