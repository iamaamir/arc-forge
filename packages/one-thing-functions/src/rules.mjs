import { walk } from "./scanner.mjs";

export function checkParsedFile(parsed, config) {
  const violations = [];
  walk(parsed.ast, (node) => inspectNode(node, parsed, config, violations));
  return violations;
}

function inspectNode(node, parsed, config, violations) {
  if (!isFunctionNode(node)) return;
  inspectArgumentCount(node, parsed, config, violations);
  inspectFunctionLength(node, parsed, config, violations);
  inspectDestructuredBag(node, parsed, config, violations);
}

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type);
}

function inspectArgumentCount(node, parsed, config, violations) {
  if (isAllowedConstructor(node)) return;
  if (isAllowedUtility(node, config)) return;
  if (node.params.length <= 1) return;
  violations.push(createViolation(node, parsed, `has ${node.params.length} args`));
}

function inspectFunctionLength(node, parsed, config, violations) {
  const length = node.loc.end.line - node.loc.start.line + 1;
  if (length <= config.maxLines) return;
  violations.push(createViolation(node, parsed, `has ${length} lines`));
}

function inspectDestructuredBag(node, parsed, config, violations) {
  if (isAllowedFactory(node, config)) return;
  if (isAllowedConstructor(node)) return;
  const firstParam = node.params[0];
  if (!firstParam || !isMultiFieldPattern(firstParam)) return;
  violations.push(createViolation(node, parsed, "uses destructured object bag"));
}

function isAllowedConstructor(node) {
  if (node.type !== "FunctionExpression") return false;
  const parent = node.parent;
  if (!parent || parent.type !== "MethodDefinition") return false;
  if (parent.kind !== "constructor") return false;
  if (node.params.length <= 2) return true;
  return node.params.length === 1 && node.params[0].type === "ObjectPattern";
}

function isAllowedFactory(node, config) {
  if (!config.allowFactoryObjectParams) return false;
  const name = getFunctionName(node);
  if (!name) return false;
  if (!new RegExp(config.factoryNamePattern).test(name)) return false;
  return node.params.length === 1;
}

function isAllowedUtility(node, config) {
  return config.utilityAllowlist.includes(getFunctionName(node));
}

function isMultiFieldPattern(param) {
  if (param.type !== "ObjectPattern" && param.type !== "ArrayPattern") return false;
  return param.properties?.length > 1 || param.elements?.length > 1;
}

function createViolation(node, parsed, message) {
  return {
    filePath: parsed.filePath,
    line: node.loc.start.line,
    name: getFunctionName(node) || "<anonymous>",
    message,
  };
}

function getFunctionName(node) {
  if (node.id?.name) return node.id.name;
  if (node.parent?.id?.name) return node.parent.id.name;
  if (node.parent?.key?.name) return node.parent.key.name;
  return null;
}

export function attachParents(node) {
  walk(node, (child) => attachChildParents(child));
}

function attachChildParents(node) {
  for (const value of Object.values(node)) attachParentValue(value, node);
}

function attachParentValue(value, parent) {
  if (Array.isArray(value)) return value.forEach((item) => attachParent(item, parent));
  attachParent(value, parent);
}

function attachParent(value, parent) {
  if (value && typeof value.type === "string" && !value.parent) value.parent = parent;
}
