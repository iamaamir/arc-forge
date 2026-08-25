import { parse } from "acorn";

const DECISION_TYPES = new Set([
  "IfStatement",
  "ConditionalExpression",
  "SwitchCase",
  "CatchClause",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

export function analyzeFunctions(source) {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  const names = buildParentNames(ast);
  const functions = [];
  walk(ast, (node) => {
    if (!isFunctionNode(node)) return;
    const found = node.type === "FunctionDeclaration" ? node.id?.name : names.get(node);
    functions.push({ name: found ?? "(anonymous)", line: node.loc.start.line, cc: countComplexity(node.body) });
  });
  return functions;
}

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type);
}

function walk(node, visit) {
  if (!node || typeof node.type !== "string") return;
  if (visit(node)) return;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else walk(value, visit);
  }
}

function buildParentNames(ast) {
  const map = new Map();
  walk(ast, (node) => registerName(map, node));
  return map;
}

function registerName(map, node) {
  if (node.type === "VariableDeclarator") return registerDeclaratorName(map, node);
  if (node.type === "Property" || node.type === "MethodDefinition") return registerMemberName(map, node);
  if (node.type === "AssignmentExpression") return registerAssignmentName(map, node);
}

function registerDeclaratorName(map, node) {
  if (node.id.type === "Identifier" && node.init && isFunctionNode(node.init)) {
    map.set(node.init, node.id.name);
  }
}

function registerMemberName(map, node) {
  if (isFunctionNode(node.value)) {
    map.set(node.value, node.key?.name ?? node.key?.value);
  }
}

function registerAssignmentName(map, node) {
  if (node.left.type === "Identifier" && isFunctionNode(node.right)) {
    map.set(node.right, node.left.name);
  }
}

function countComplexity(body) {
  let cc = 1;
  walk(body, (node) => {
    if (isDecisionPoint(node)) cc += 1;
    return isFunctionNode(node) && node.body !== body;
  });
  return cc;
}

function isDecisionPoint(node) {
  return DECISION_TYPES.has(node.type) || node.type === "LogicalExpression";
}
