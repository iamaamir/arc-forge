import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { runGatesAsync } from "../src/check.mjs";
import { loadConfigAsync } from "../src/config.mjs";
import { SetupError } from "../src/errors.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(testDir, "../bin/forge-gate.mjs");
const cwd = process.cwd();

function makeProject(t, files, config = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-"));
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
  try {
    return await runGatesAsync(["deps"], await loadConfigAsync(merged));
  } catch (error) {
    if (error instanceof SetupError) return { status: 2, failedGate: null, message: error.message };
    throw error;
  }
}

const RULES = (rules, extra = {}) => ({ dependencyRules: { rules, allowNodeModules: true, unmatched: "allow", ...extra } });

test("forbidden import fails naming both endpoints", async (t) => {
  const result = await runDeps(
    t,
    {
      "scripts/release.mjs": 'import x from "../packages/forge-gate/src/check.mjs";\n',
      "packages/forge-gate/src/check.mjs": "export default 1;\n",
    },
    RULES([{ from: "scripts/**", allow: [], forbid: ["packages/*/src/**"] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "deps");
  assert.match(result.message, /scripts\/release\.mjs -> packages\/forge-gate\/src\/check\.mjs \(violates rule 1\)/);
});

test("first matching from-rule wins over later rules", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a/x.js": 'import s from "../b/secret.js";\n',
      "src/b/secret.js": "export default 1;\n",
    },
    RULES([
      { from: "src/a/**", allow: ["src/b/**"] },
      { from: "src/**", forbid: ["src/b/secret.js"] },
    ]),
  );
  assert.equal(result.status, 0);
});

test("forbid beats allow within the matched rule", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/app.js": 'import e from "./lib/evil.js";\n',
      "src/lib/evil.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: ["src/lib/**"], forbid: ["src/lib/evil.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/app\.js -> src\/lib\/evil\.js \(violates rule 1\)/);
});

test("sibling imports never violate via implicit self-allow", async (t) => {
  const result = await runDeps(
    t,
    {
      "scripts/a.mjs": 'import b from "./b.mjs";\n',
      "scripts/b.mjs": "export default 1;\n",
    },
    RULES([{ from: "scripts/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("extensionless relative specifier resolves via configured extensions", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a.js": 'import b from "./b";\n',
      "src/b.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/b.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/a\.js -> src\/b\.js/);
});

test("directory index resolves for extensionless specifier", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/a.js": 'import u from "./util";\n',
      "src/util/index.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/util/index.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/a\.js -> src\/util\/index\.js/);
});

test("workspace bare specifier resolving via node_modules symlink is not external", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-ws-"));
  const files = {
    "lib/mylib/index.js": "export default 1;\n",
    "src/main.js": 'import m from "mylib";\n',
  };
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  symlinkSync(path.join(dir, "lib", "mylib"), path.join(dir, "node_modules", "mylib"), "dir");
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const config = await loadConfigAsync(RULES([{ from: "src/**", allow: [], forbid: ["lib/**"] }]));
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/main\.js -> lib\/mylib.*violates rule 1/);
});

test("external bare specifier is ignored by default allowNodeModules true", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import fs from "node:fs";\nimport pm from "picomatch";\n' },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("allowNodeModules glob array permits matching modules and denies others", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import pm from "left-pad";\nimport rx from "react";\n' },
    RULES([{ from: "src/**", allow: [] }], { allowNodeModules: ["left-pad/**"] }),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /react/);
  assert.doesNotMatch(result.message, /-> left-pad/);
});

test("allowNodeModules false denies external bare specifiers", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import pm from "picomatch";\n' },
    RULES([{ from: "src/**", allow: [] }], { allowNodeModules: false }),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /picomatch/);
});

test("package.json imports (#specifiers) resolving inside the repo participate", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","type":"module","imports":{"#core/*":"./src/core/*.js"}}\n',
      "src/cli/run.js": 'import x from "#core/index";\n',
      "src/core/index.js": "export default 1;\n",
    },
    RULES([{ from: "src/cli/**", allow: [], forbid: ["src/core/**"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/cli\/run\.js -> src\/core\/index\.js \(violates rule 1\)/);
});

test("unknown #specifiers fall through to external handling", async (t) => {
  const result = await runDeps(
    t,
    {
      "package.json": '{"name":"proj","imports":{}}\n',
      "src/a.js": 'import x from "#missing/thing";\n',
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("allowNodeModules pattern can match the resolved node_modules path of a subpath import", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-nmpath-"));
  const files = {
    "node_modules/left-pad/package.json": '{"name":"left-pad","main":"index.js"}\n',
    "node_modules/left-pad/index.js": "module.exports = 1;\n",
    "src/a.js": 'import s from "left-pad/thing";\n',
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
  // The subpath specifier ("left-pad/thing") does not match the bare-name
  // glob, so only the resolved node_modules-relative path arm
  // ("node_modules/left-pad") can allow this import.
  const result = await runGatesAsync(
    ["deps"],
    await loadConfigAsync(
      RULES([{ from: "src/**", allow: [] }], { allowNodeModules: ["node_modules/left-pad"] }),
    ),
  );
  assert.equal(result.status, 0);
});

test("TypeScript files containing enums are scanned by the deps gate", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/main.ts": 'import { Kind } from "./enums";\nexport function pick(k: Kind): string { return Kind[k] ?? ""; }\n',
      "src/enums.ts": "export enum Kind { Good, Bad }\n",
    },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 0);
});

test("workspace package without a package.json resolves via its directory index", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-nopkg-"));
  mkdirSync(path.join(dir, "lib", "nopkg"), { recursive: true });
  writeFileSync(path.join(dir, "lib", "nopkg", "index.js"), "export default 1;\n");
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src", "main.js"), 'import n from "nopkg";\n');
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  symlinkSync(path.join(dir, "lib", "nopkg"), path.join(dir, "node_modules", "nopkg"), "dir");
  t.after(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  const result = await runGatesAsync(
    ["deps"],
    await loadConfigAsync(RULES([{ from: "src/**", allow: [], forbid: ["lib/nopkg/**"] }])),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/main\.js -> lib\/nopkg\/index\.js \(violates rule 1\)/);
});

test("plain node_modules installs inside the repo are external, not workspace targets", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-inst-"));
  const files = {
    "node_modules/fakepkg/package.json": '{"name":"fakepkg","main":"index.js"}\n',
    "node_modules/fakepkg/index.js": "module.exports = 1;\n",
    "src/a.js": 'import f from "fakepkg";\n',
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
  const passing = await runGatesAsync(["deps"], await loadConfigAsync({ roots: ["src"], ...RULES([{ from: "src/**", allow: [] }]) }));
  assert.equal(passing.status, 0);
  const denied = await runGatesAsync(["deps"], await loadConfigAsync({
    roots: ["src"],
    ...RULES([{ from: "src/**", allow: [] }], { allowNodeModules: false }),
  }));
  assert.equal(denied.status, 1);
  assert.match(denied.message, /fakepkg/);
});

test("unresolvable relative import is a gate failure naming file and specifier", async (t) => {
  const result = await runDeps(
    t,
    { "src/a.js": 'import x from "./does-not-exist";\n' },
    RULES([{ from: "src/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "deps");
  assert.match(result.message, /src\/a\.js/);
  assert.match(result.message, /\.\/does-not-exist/);
});

test("relative import escaping the repository root fails naming file and specifier", async (t) => {
  const result = await runDeps(
    t,
    { "proj/src/a.js": 'import x from "../../outside.js";\n' },
    RULES([{ from: "proj/src/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /proj\/src\/a\.js/);
  assert.match(result.message, /\.\.\/\.\.\/outside\.js/);
});

test("require() with literal specifier participates so .cjs files are covered", async (t) => {
  const result = await runDeps(
    t,
    {
      "legacy/old.cjs": 'const secret = require("./secret.js");\nmodule.exports = secret;\n',
      "legacy/secret.js": "module.exports = 1;\n",
    },
    RULES([{ from: "legacy/**", allow: [], forbid: ["legacy/secret.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /legacy\/old\.cjs -> legacy\/secret\.js \(violates rule 1\)/);
});

test("dynamic import with literal specifier participates", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/lazy.js": 'export async function load() {\n  return import("./secret.js");\n}\n',
      "src/secret.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/secret.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/lazy\.js -> src\/secret\.js/);
});

test("dynamic import of a variable is silently skipped", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/lazy.js":
        'const name = "./secret.js";\nexport async function load() {\n  return import(name);\n}\n',
      "src/secret.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/secret.js"] }]),
  );
  assert.equal(result.status, 0);
});

test("export-from declarations participate", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/barrel.js": 'export { ok } from "./secret.js";\n',
      "src/secret.js": "export const ok = () => 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/secret.js"] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/barrel\.js -> src\/secret\.js/);
});

test("targets neither allowed nor forbidden under the matched rule are denied", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/cli/run.js": 'import x from "../util/helper.js";\n',
      "src/util/helper.js": "export default 1;\n",
    },
    RULES([{ from: "src/cli/**", allow: [] }]),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /src\/cli\/run\.js -> src\/util\/helper\.js \(violates rule 1\)/);
});

test("missing dependencyRules key is a setup error pointing at rule negotiation", async (t) => {
  const result = await runDeps(t, { "src/a.js": "export default 1;\n" }, {});
  assert.equal(result.status, 2);
  assert.match(result.message, /dependencyRules/);
  assert.match(result.message, /forge-rules skill if available/);
});

test("misconfiguration matrix surfaces as setup errors with actionable stderr", async (t) => {
  const cases = [
    [{ dependencyRules: { rules: "nope", unmatched: "allow" } }, /rules must be an array/],
    [{ dependencyRules: { rules: [], unmatched: "deny" } }, /combined with unmatched "deny"/],
    [{ dependencyRules: { rules: [{ allow: [] }], unmatched: "allow" } }, /missing "from"/],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: "x" }], unmatched: "allow" } }, /must be an array of glob strings/],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: [42] }], unmatched: "allow" } }, /must be an array of glob strings/],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: [] }], unmatched: "sometimes" } }, /unmatched must be/],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: [""] }], unmatched: "allow" } }, /invalid glob ""/],
    [{ dependencyRules: "not an object" }, /dependencyRules must be an object/],
    [{ dependencyRules: { rules: [{ from: "src/**", allow: [] }], unmatched: "allow", allowNodeModules: "yes" } }, /allowNodeModules must be/],
  ];
  for (const [config, pattern] of cases) {
    const result = await runDeps(t, { "src/a.js": "export default 1;\n" }, config);
    assert.equal(result.status, 2, JSON.stringify(config));
    assert.match(result.message, pattern);
  }
});

test("unmatched deny violates scanned files without a matching from rule", async (t) => {
  const result = await runDeps(
    t,
    { "orphan/a.js": "export default 1;\n" },
    RULES([{ from: "src/**", allow: [] }], { unmatched: "deny" }),
  );
  assert.equal(result.status, 1);
  assert.match(result.message, /orphan\/a\.js/);
  assert.match(result.message, /matches no dependencyRules\.from pattern/);
});

test("negative fixture proves the gate bites on arc-forge-style rules", async (t) => {
  const fixtureDir = path.resolve(testDir, "fixtures/deps-violation");
  process.chdir(fixtureDir);
  t.after(() => process.chdir(cwd));
  const config = await loadConfigAsync();
  const result = await runGatesAsync(["deps"], config);
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "deps");
  assert.match(result.message, /src\/cli\/run\.js -> src\/core\/index\.js \(violates rule 2\)/);
});

test("deps runs before all other gates", async (t) => {
  const { config: merged } = makeProject(
    t,
    {
      "src/app.js": 'import x from "./forbidden.js";\n',
      "src/forbidden.js": "export default 1;\n",
    },
    {
      dependencyRules: { rules: [{ from: "src/**", allow: [], forbid: ["src/forbidden.js"] }], unmatched: "allow" },
      testCommand: "false",
    },
  );
  const config = await loadConfigAsync(merged);
  const result = await runGatesAsync(["deps", "spec", "crap", "mutation", "qa"], config);
  assert.equal(result.status, 1);
  assert.equal(result.failedGate, "deps");
});

test("violations sort by file with most violations first", async (t) => {
  const result = await runDeps(
    t,
    {
      "src/busy.js": 'import a from "./f1.js";\nimport b from "./f2.js";\nimport c from "./f3.js";\n',
      "src/quiet.js": 'import a from "./f1.js";\n',
      "src/f1.js": "export default 1;\n",
      "src/f2.js": "export default 1;\n",
      "src/f3.js": "export default 1;\n",
    },
    RULES([{ from: "src/**", allow: [], forbid: ["src/f1.js", "src/f2.js", "src/f3.js"] }]),
  );
  assert.equal(result.status, 1);
  const busyIndex = result.message.indexOf("src/busy.js");
  const quietIndex = result.message.indexOf("src/quiet.js");
  assert.ok(busyIndex !== -1 && quietIndex !== -1);
  assert.ok(busyIndex < quietIndex, "busiest file must be reported first");
  assert.match(result.message, /3 violations across 2 files|busy\.js[\s\S]*quiet\.js/);
});

test("cli accepts --deps flag and rejects misspellings", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "gnt-deps-cli-"));
  writeFileSync(path.join(dir, "forge-gate.config.json"), JSON.stringify({}));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bad = spawnSync(process.execPath, [cli, "check", "--dep"], { encoding: "utf8", cwd: dir });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown flag "--dep"/);
});
