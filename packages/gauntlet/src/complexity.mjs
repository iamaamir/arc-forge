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
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && isFunctionNode(node.init)) {
      map.set(node.init, node.id.name);
    }
    if ((node.type === "Property" || node.type === "MethodDefinition") && isFunctionNode(node.value)) {
      map.set(node.value, node.key?.name ?? node.key?.value);
    }
    if (node.type === "AssignmentExpression" && node.left.type === "Identifier" && isFunctionNode(node.right)) {
      map.set(node.right, node.left.name);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(ast);
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
