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
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (isFunctionNode(node)) {
      const name = node.type === "FunctionDeclaration" ? node.id?.name : names.get(node) ?? "(anonymous)";
      functions.push({ name, line: node.loc.start.line, cc: countComplexity(node.body) });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(ast);
  return functions;
}

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type);
}

function buildParentNames(ast) {
  const map = new Map();
  const visit = (node, assignedName) => {
    if (!node || typeof node.type !== "string") return;
    if ((node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && assignedName) {
      map.set(node, assignedName);
    }
    let childAssigned = assignedName;
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier") childAssigned = node.id.name;
    if (node.type === "Property" || node.type === "MethodDefinition") {
      childAssigned = node.key?.name ?? node.key?.value;
    }
    if (node.type === "AssignmentExpression" && node.left.type === "Identifier") childAssigned = node.left.name;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((item) => visit(item, childAssigned));
      else if (value && typeof value.type === "string") visit(value, childAssigned);
    }
  };
  visit(ast, null);
  return map;
}

function countComplexity(body) {
  let cc = 1;
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (DECISION_TYPES.has(node.type)) cc += 1;
    if (node.type === "LogicalExpression") cc += 1;
    if (isFunctionNode(node) && node.body !== body) return;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(body);
  return cc;
}
