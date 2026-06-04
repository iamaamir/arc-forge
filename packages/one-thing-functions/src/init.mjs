import { existsSync, readFileSync, writeFileSync } from "node:fs";

const configFile = "one-thing-functions.config.mjs";

export function initProject(options = {}) {
  const roots = options.roots || ["src"];
  const changes = [];
  if (!existsSync(configFile)) {
    writeFileSync(configFile, createConfig(roots));
    changes.push(`created ${configFile}`);
  }
  if (existsSync("package.json")) changes.push(...updatePackageJson(roots));
  return changes;
}

function createConfig(roots) {
  return `export default {\n  profile: "fp-first",\n  roots: ${JSON.stringify(roots)},\n  maxLines: 25,\n  utilityAllowlist: [],\n};\n`;
}

function updatePackageJson(roots) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["lint:functions"] = `one-thing-functions check ${roots.join(" ")}`;
  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  return ["updated package.json scripts.lint:functions"];
}
