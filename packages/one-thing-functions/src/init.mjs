import { existsSync, readFileSync, writeFileSync } from "node:fs";

const configFile = "one-thing-functions.config.mjs";
const commonRoots = ["src", "lib", "app", "pages", "components", "scripts", "packages", "background", "content", "popup", "providers"];

export function initProject(options = {}) {
  const roots = options.roots || detectRoots();
  const changes = [];
  if (!existsSync(configFile)) {
    writeFileSync(configFile, createConfig(roots));
    changes.push(`created ${configFile}`);
  }
  if (existsSync("package.json")) changes.push(...updatePackageJson(roots));
  return changes;
}

function detectRoots() {
  const roots = commonRoots.filter((root) => existsSync(root));
  if (roots.length > 0) return roots;
  return ["."];
}

function createConfig(roots) {
  return `export default {\n  profile: "fp-first",\n  roots: ${JSON.stringify(roots)},\n  maxLines: 25,\n  utilityAllowlist: [],\n};\n`;
}

function updatePackageJson(roots) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const target = roots.join(" ");
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["lint:functions"] = `one-thing-functions check ${target} --advisory`;
  pkg.scripts["lint:functions:strict"] = `one-thing-functions check ${target}`;
  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  return ["updated package.json function lint scripts"];
}
