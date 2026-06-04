import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { initProject } from "../src/init.mjs";

function inTempProject(run) {
  const previous = process.cwd();
  const dir = mkdtempSync(path.join(tmpdir(), "otf-init-"));
  process.chdir(dir);
  try {
    return run(dir);
  } finally {
    process.chdir(previous);
  }
}

test("init creates config and lint script", () => {
  inTempProject(() => {
    writeFileSync("package.json", JSON.stringify({ scripts: {} }));
    const changes = initProject({ roots: ["src", "scripts"] });
    const config = readFileSync("one-thing-functions.config.mjs", "utf8");
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    assert.equal(changes.length, 2);
    assert.match(config, /roots: \["src","scripts"\]/);
    assert.equal(pkg.scripts["lint:functions:audit"], "one-thing-functions check src scripts --advisory");
    assert.equal(pkg.scripts["lint:functions"], "one-thing-functions check src scripts");
  });
});

test("init detects existing common roots", () => {
  inTempProject(() => {
    mkdirSync("lib");
    mkdirSync("scripts");
    writeFileSync("package.json", JSON.stringify({ scripts: {} }));
    initProject();
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    assert.equal(pkg.scripts["lint:functions:audit"], "one-thing-functions check lib scripts --advisory");
    assert.equal(pkg.scripts["lint:functions"], "one-thing-functions check lib scripts");
  });
});

test("init falls back to current directory", () => {
  inTempProject(() => {
    writeFileSync("package.json", JSON.stringify({ scripts: {} }));
    initProject();
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    assert.equal(pkg.scripts["lint:functions:audit"], "one-thing-functions check . --advisory");
    assert.equal(pkg.scripts["lint:functions"], "one-thing-functions check .");
  });
});
