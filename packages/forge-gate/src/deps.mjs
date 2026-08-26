import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse } from "acorn";
import picomatch from "picomatch";
import { transformSync } from "amaro";
import { defaultConfig } from "./config.mjs";
import { SetupError } from "./errors.mjs";
import { listFiles } from "./filelist.mjs";

const TS_EXTENSIONS = new Set([".ts", ".mts", ".cts"]);
const SOURCE_CARRYING_DECLARATIONS = new Set(["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration"]);
const ACORN_OPTIONS = { ecmaVersion: "latest", sourceType: "module" };
const MATCH_OPTIONS = { dot: true };

export function runDepsGate(config) {
  const violations = collectDepsViolations(config);
  if (violations.length === 0) return [];
  return [
    "DEPS gate failed:",
    ...violations.map((violation) => `  ${violation.message}`),
    summaryLine(violations),
    "Fix the imports or renegotiate the rules — run the forge-rules skill if available, " +
    "or see https://github.com/iamaamir/arc-forge#dependency-rules",
  ];
}

function summaryLine(violations) {
  const files = new Set(violations.map((violation) => violation.file)).size;
  const plural = (count) => (count === 1 ? "" : "s");
  return `${violations.length} violation${plural(violations.length)} across ${files} file${plural(files)}`;
}

export function collectDepsViolations(config) {
  const depRules = validateDependencyRules(config);
  const ctx = createEvalContext(process.cwd(), depRules, config);
  const scanned = listFiles(config).map((fileAbs) => scanFile(fileAbs, ctx));
  const violations = scanned.flatMap((entry) => violationsForFile(entry, ctx));
  return sortByFileWeight(violations);
}

function sortByFileWeight(violations) {
  const counts = countPerFile(violations);
  return [...violations].sort(
    (a, b) =>
      counts.get(b.file) - counts.get(a.file) ||
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
  );
}

function countPerFile(violations) {
  const counts = new Map();
  for (const violation of violations) {
    counts.set(violation.file, (counts.get(violation.file) ?? 0) + 1);
  }
  return counts;
}

function createEvalContext(root, depRules, config) {
  return {
    root,
    rootReal: realpathSync(root),
    rules: depRules.rules,
    unmatched: depRules.unmatched ?? "deny",
    allowNodeModules: depRules.allowNodeModules ?? true,
    extensions: config.extensions ?? defaultConfig.extensions,
    ruleNumber: (index) => index + 1,
    matcher(pattern) {
      return picomatch(pattern, MATCH_OPTIONS);
    },
  };
}

function scanFile(fileAbs, ctx) {
  const relFile = toRepoRel(fileAbs, ctx.root);
  const records = extractImports(readAndParse(fileAbs, relFile)).map((specifier) => ({
    specifier,
    resolution: resolveSpecifier(specifier, fileAbs, ctx),
  }));
  return { relFile, records, ruleIndex: findMatchingRule(relFile, ctx) };
}

function readAndParse(filePath, label) {
  const source = readFileSync(filePath, "utf8");
  try {
    const code = TS_EXTENSIONS.has(path.extname(filePath))
      ? transformSync(source, { mode: "transform" }).code
      : source;
    return parse(code, ACORN_OPTIONS);
  } catch (error) {
    throw new SetupError(`cannot parse ${label}: ${error.message.split("\n")[0]}`);
  }
}

function extractImports(ast) {
  const specifiers = new Set();
  walkAst(ast, (node) => {
    const literal = importSpecifierOf(node);
    if (typeof literal === "string") specifiers.add(literal);
  });
  return [...specifiers];
}

function importSpecifierOf(node) {
  if (SOURCE_CARRYING_DECLARATIONS.has(node.type) || node.type === "ImportExpression") {
    return literalString(node.source);
  }
  if (isLiteralRequireCall(node)) return literalString(node.arguments[0]);
  return undefined;
}

function isLiteralRequireCall(node) {
  // callee.name is undefined for member/object callees, so the name check alone
  // excludes require.resolve()-style calls; extractImports re-checks the result
  // is a string, so a zero-argument require() is harmless.
  return node.type === "CallExpression" && node.callee?.name === "require";
}

function literalString(node) {
  // Callers re-check the result is a string before using it as a specifier,
  // so non-string Literal values are returned and filtered there.
  return node?.type === "Literal" ? node.value : undefined;
}

function walkAst(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walkAst(child, visit));
    else walkAst(value, visit);
  }
}

function findMatchingRule(relFile, ctx) {
  return ctx.rules.findIndex((rule) => ctx.matcher(rule.from)(relFile));
}

function violationsForFile(entry, ctx) {
  return [...brokenImportViolations(entry), ...ruleViolations(entry, ctx)];
}

function brokenImportViolations(entry) {
  return entry.records
    .filter((record) => record.resolution.kind === "failure")
    .map((record) => ({ file: entry.relFile, message: brokenImportMessage(entry.relFile, record) }));
}

function brokenImportMessage(relFile, record) {
  const why =
    record.resolution.reason === "escapes"
      ? "resolves outside the repository — remove the import"
      : "cannot be resolved — fix or remove the broken import";
  return `${relFile} imports "${record.specifier}" which ${why}`;
}

function ruleViolations(entry, ctx) {
  if (entry.ruleIndex === -1) return unmatchedViolations(entry, ctx);
  const rule = ctx.rules[entry.ruleIndex];
  return entry.records.flatMap((record) => ruleViolationForRecord(entry, rule, record, ctx));
}

function unmatchedViolations(entry, ctx) {
  if (ctx.unmatched !== "deny") return [];
  return [{
    file: entry.relFile,
    message:
      `${entry.relFile} matches no dependencyRules.from pattern (unmatched: "deny") — ` +
      'add a rule covering it or set unmatched to "allow"',
  }];
}

function ruleViolationForRecord(entry, rule, record, ctx) {
  const number = ctx.ruleNumber(entry.ruleIndex);
  if (record.resolution.kind === "external") {
    return externalViolation(entry, record, ctx);
  }
  if (record.resolution.kind === "failure") return [];
  return targetViolations(entry, rule, record.resolution.rel, number, ctx);
}

function externalViolation(entry, record, ctx) {
  if (isExternalAllowed(record, ctx)) return [];
  return [{
    file: entry.relFile,
    message:
      `${entry.relFile} -> ${record.specifier} (external module denied by allowNodeModules) — ` +
      "allow it explicitly or drop the dependency",
  }];
}

function targetViolations(entry, rule, target, number, ctx) {
  if (matchesAny(rule.forbid, target, ctx)) {
    return [violationOf(entry, target, number, "remove the import or update dependencyRules")];
  }
  if (ctx.matcher(rule.from)(target)) return [];
  if (matchesAny(rule.allow, target, ctx)) return [];
  return [
    violationOf(
      entry,
      target,
      number,
      `target is neither allowed nor forbidden by rule ${number}; add an explicit allow or forbid`,
    ),
  ];
}

function violationOf(entry, target, number, remediation) {
  return {
    file: entry.relFile,
    message: `${entry.relFile} -> ${target} (violates rule ${number}) — ${remediation}`,
  };
}

function matchesAny(patterns, target, ctx) {
  return patterns.some((pattern) => ctx.matcher(pattern)(target));
}

function isExternalAllowed(record, ctx) {
  const setting = ctx.allowNodeModules;
  if (typeof setting === "boolean") return setting;
  return setting.some(
    (pattern) =>
      ctx.matcher(pattern)(record.specifier) ||
      (record.resolution.nodeModulesPath && ctx.matcher(pattern)(record.resolution.nodeModulesPath)),
  );
}

function toRepoRel(absPath, root) {
  return path.relative(root, absPath).split(path.sep).join("/");
}

function resolveSpecifier(specifier, importerAbs, ctx) {
  if (specifier.startsWith(".")) return resolveRelative(specifier, importerAbs, ctx);
  return resolveBare(specifier, importerAbs, ctx);
}

function resolveRelative(specifier, importerAbs, ctx) {
  const target = path.resolve(path.dirname(importerAbs), specifier);
  if (!insideRepo(target, ctx)) return { kind: "failure", reason: "escapes" };
  const found = resolveToFile(target, ctx.extensions);
  if (!found) return { kind: "failure", reason: "unresolved" };
  return { kind: "relative", rel: toRepoRel(found, ctx.root) };
}

function insideRepo(target, ctx) {
  const rel = path.relative(ctx.root, target);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function resolveToFile(base, extensions) {
  return asFile(base) ?? fileWithExtensions(base, extensions) ?? directoryIndex(base, extensions);
}

function asFile(filePath) {
  return isFile(filePath) ? filePath : null;
}

function fileWithExtensions(base, extensions) {
  const candidate = extensions.map((extension) => base + extension).find(isFile);
  return candidate ?? null;
}

function directoryIndex(base, extensions) {
  // No isDirectory pre-check needed: joining index candidates onto a
  // non-directory simply finds no existing file.
  const candidate = extensions
    .map((extension) => path.join(base, `index${extension}`))
    .find(isFile);
  return candidate ?? null;
}

function isFile(filePath) {
  return statSync(filePath, { throwIfNoEntry: false })?.isFile() ?? false;
}

function resolveBare(specifier, importerAbs, ctx) {
  if (specifier.startsWith("#")) return resolveSubpathImport(specifier, importerAbs, ctx);
  const installed = findInstalledPackage(packageNameOf(specifier), importerAbs);
  if (!installed) return { kind: "external" };
  return classifyInstalledPackage(installed, ctx);
}

// Standard node_modules walk-up: the nearest ancestor node_modules entry wins.
function findInstalledPackage(pkgName, importerAbs) {
  let dir = path.dirname(importerAbs);
  for (;;) {
    const candidate = path.join(dir, "node_modules", pkgName);
    if (existsSync(candidate)) return { candidate, real: safeRealpath(candidate) };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function classifyInstalledPackage(installed, ctx) {
  // existsSync passed before safeRealpath ran; if realpath still failed
  // (racy/dangling entry), using undefined here fails loudly downstream
  // instead of silently misclassifying the package as external.
  const real = installed.real;
  // Workspace packages are symlinks out of node_modules into repo source
  // (e.g. npm workspaces). An entry whose realpath still lives under
  // node_modules is an ordinary installed dependency — treat as external.
  const inRepoSource =
    !real.includes(`${path.sep}node_modules${path.sep}`) &&
    insideRoot(real, ctx.rootReal);
  if (!inRepoSource) {
    return { kind: "external", nodeModulesPath: toNodeModulesPath(installed.candidate) };
  }
  return { kind: "relative", rel: toRepoRel(packageEntry(real, ctx.extensions), ctx.root) };
}

function insideRoot(target, rootReal) {
  // A package's realpath can never equal the repo root itself (that would be
  // the repo), so containment reduces to the prefix check.
  return target.startsWith(rootReal + path.sep);
}

function safeRealpath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return undefined;
  }
}

function toNodeModulesPath(candidate) {
  const marker = `${path.sep}node_modules${path.sep}`;
  const index = candidate.lastIndexOf(marker);
  return index === -1 ? candidate : candidate.slice(index + path.sep.length).split(path.sep).join("/");
}

function packageNameOf(specifier) {
  if (!specifier.startsWith("@")) return specifier.split("/")[0];
  return specifier.split("/").slice(0, 2).join("/");
}

function packageEntry(pkgDir, extensions) {
  return mainFileEntry(pkgDir, extensions) ?? directoryIndex(pkgDir, extensions) ?? pkgDir;
}

function mainFileEntry(pkgDir, extensions) {
  const main = readPackageField(pkgDir, "main");
  if (typeof main !== "string") return null;
  return resolveToFile(path.resolve(pkgDir, main), extensions);
}

function readPackageField(pkgDir, field) {
  try {
    return JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"))[field];
  } catch {
    return undefined;
  }
}

// package.json "imports" (#specifiers): nearest package.json wins, string
// targets only (with single-"*" pattern substitution) — arrays/conditional
// targets are documented non-goals in v1.
function resolveSubpathImport(specifier, importerAbs, ctx) {
  const pkgDir = nearestPackageDir(path.dirname(importerAbs));
  const target = pkgDir === null ? undefined : lookupImportsTarget(pkgDir, specifier);
  if (pkgDir === null || typeof target !== "string") return { kind: "external" };
  return resolveRelative(target, path.join(pkgDir, "proxy.js"), ctx);
}

function lookupImportsTarget(pkgDir, specifier) {
  const imports = readPackageField(pkgDir, "imports");
  if (!imports || typeof imports !== "object") return undefined;
  if (typeof imports[specifier] === "string") return imports[specifier];
  return patternImportsTarget(imports, specifier);
}

function patternImportsTarget(imports, specifier) {
  const patternKey = Object.keys(imports).find(
    (key) => key.endsWith("*") && specifier.startsWith(key.slice(0, -1)),
  );
  if (patternKey === undefined) return undefined;
  const target = imports[patternKey];
  if (typeof target !== "string" || !target.includes("*")) return undefined;
  return target.replace("*", specifier.slice(patternKey.length - 1));
}

function nearestPackageDir(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function validateDependencyRules(config) {
  const depRules = config.dependencyRules;
  if (depRules === undefined) {
    throw new SetupError(
      "dependencyRules is not configured — negotiate rules with your team by running the forge-rules skill " +
        "if available (otherwise see https://github.com/iamaamir/arc-forge#dependency-rules), " +
        "then add them to forge-gate.config.json",
    );
  }
  assertRulesObject(depRules);
  assertRulesArray(depRules);
  assertUnmatchedPolicy(depRules);
  depRules.rules.forEach((rule, index) => validateRule(rule, index));
  validateAllowNodeModules(depRules.allowNodeModules);
  return depRules;
}

function assertRulesObject(depRules) {
  if (typeof depRules === "object" && !Array.isArray(depRules)) return;
  throw new SetupError(
    'dependencyRules must be an object like {"rules": [{"from": "src/**", "allow": [...]}], "unmatched": "deny"}',
  );
}

function assertRulesArray(depRules) {
  if (Array.isArray(depRules.rules)) return;
  throw new SetupError('dependencyRules.rules must be an array of {"from", "allow", "forbid"} rules');
}

function assertUnmatchedPolicy(depRules) {
  const unmatched = depRules.unmatched ?? "deny";
  if (unmatched !== "deny" && unmatched !== "allow") {
    throw new SetupError(
      `dependencyRules.unmatched must be "deny" or "allow", got ${JSON.stringify(depRules.unmatched)}`,
    );
  }
  if (depRules.rules.length > 0 || unmatched !== "deny") return;
  throw new SetupError(
    'dependencyRules: "rules": [] combined with unmatched "deny" denies every scanned file — ' +
      'add rules or set unmatched to "allow"',
  );
}

function validateRule(rule, index) {
  assertRuleObject(rule, index);
  assertFromPattern(rule, index);
  validatePatternArray(rule.allow, "allow", index);
  validatePatternArray(rule.forbid, "forbid", index);
  // Normalize after validation so matching code never handles undefined lists.
  rule.allow ??= [];
  rule.forbid ??= [];
}

function assertRuleObject(rule, index) {
  if (typeof rule === "object" && rule !== null && !Array.isArray(rule)) return;
  throw new SetupError(`dependencyRules rule ${index + 1} must be an object with "from", "allow", "forbid"`);
}

function assertFromPattern(rule, index) {
  if (typeof rule.from !== "string" || rule.from.trim() === "") {
    throw new SetupError(`dependencyRules rule ${index + 1} is missing "from" — every rule needs a from glob`);
  }
  assertNonEmptyPatternString(rule.from, `rule ${index + 1} from`);
}

function validatePatternArray(patterns, key, index) {
  if (patterns === undefined) return;
  if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== "string")) {
    throw new SetupError(`dependencyRules rule ${index + 1} ${key} must be an array of glob strings`);
  }
  patterns.forEach((pattern) => assertNonEmptyPatternString(pattern, `rule ${index + 1} ${key}`));
}

function validateAllowNodeModules(setting) {
  if (setting === undefined || typeof setting === "boolean") return;
  if (Array.isArray(setting) && setting.every((pattern) => typeof pattern === "string")) {
    setting.forEach((pattern) => assertNonEmptyPatternString(pattern, "allowNodeModules"));
    return;
  }
  throw new SetupError("dependencyRules.allowNodeModules must be true, false, or an array of glob strings");
}

// Glob syntax is picomatch's domain: makeRe accepted every pathological input
// probed (see gauntlet-state.md), so only empty/non-string patterns are
// rejected up front and compilation happens at match time.
function assertNonEmptyPatternString(pattern, where) {
  if (typeof pattern === "string" && pattern !== "") return;
  throw new SetupError(
    `invalid glob ${JSON.stringify(pattern ?? null)} in dependencyRules (${where}) — patterns must be non-empty strings`,
  );
}
