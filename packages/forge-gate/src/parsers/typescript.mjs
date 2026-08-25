import { transformSync } from "amaro";
import { analyze as analyzeJavaScript } from "./javascript.mjs";
import { SetupError } from "../errors.mjs";

// Syntax amaro transform mode handles silently but forge-gate cannot score:
// - parameter properties are lowered into constructor assignments, which
//   changes what the code means mid-analysis, so we reject up front;
// - decorators survive the transform and acorn cannot parse them.
// Both checks run on the ORIGINAL source because that is where the syntax
// lives. Chosen over post-transform detection after observing amaro 1.1.11:
// param properties do not error in transform mode (they are silently
// rewritten) and decorators pass through verbatim.
const PARAM_PROPERTIES = /constructor\s*\(\s*(?:private|public|protected|readonly)\b/;
const MULTILINE_PARAM_PROPERTIES = /constructor\s*\(\s*\n\s*(?:private|public|protected|readonly)\b/;
const DECORATOR_LINE = /^\s*@[A-Za-z_$][\w$.]*\s*($|\()/m;

export function analyze(source, { filename } = {}) {
  const label = filename ?? "input";
  rejectUnsupportedSyntax(source, label);
  let transformed;
  try {
    transformed = transformSync(source, { mode: "transform" });
  } catch (error) {
    throw new SetupError(`cannot parse TypeScript in ${label}: ${error.message}`);
  }
  const functions = analyzeJavaScript(transformed.code);
  return withOriginalPositions(functions, source, transformed, label);
}

function rejectUnsupportedSyntax(source, label) {
  if (PARAM_PROPERTIES.test(source) || MULTILINE_PARAM_PROPERTIES.test(source)) {
    throw new SetupError(
      `${label}: TypeScript parameter properties (e.g. "constructor(private service)") are not supported — ` +
        "declare constructor parameters explicitly and assign them in the body",
    );
  }
  if (DECORATOR_LINE.test(source)) {
    throw new SetupError(
      `${label}: decorators (@) are not supported — remove them or exclude the file via roots/extensions`,
    );
  }
}

// Line-fidelity invariant: CRAP reports must cite original file:line. Amaro
// transform mode reflows output (type-only lines vanish; enum/namespace
// lowering expands), so generated positions drift. Strip mode replaces erased
// types with whitespace and therefore preserves positions exactly — it is
// used as a position oracle for every function found by the transform parse.
// When strip mode is unavailable the file contains non-erasable syntax whose
// lowering shifts lines, so the file is rejected naming that construct.
function withOriginalPositions(functions, source, transformed, label) {
  let stripped;
  try {
    stripped = transformSync(source, { mode: "strip-only" });
  } catch (error) {
    throw new SetupError(
      `${label}: ${error.message.split("\n")[0]} — this non-erasable construct cannot be scored for CRAP ` +
        "because lowering it shifts line numbers",
    );
  }
  const oracle = analyzeJavaScript(stripped.code);
  if (!positionsUsable(oracle, functions)) {
    throw new SetupError(
      `${label}: line positions shifted under the TypeScript transform and cannot be cited faithfully — ` +
        "the file is excluded from CRAP scoring",
    );
  }
  return functions.map((fn, index) => ({ ...fn, line: oracle[index].line, endLine: oracle[index].endLine }));
}

function positionsUsable(oracle, functions) {
  if (oracle.length !== functions.length) return false;
  return oracle.every((fn, index) => !fn.name || !functions[index].name || fn.name === functions[index].name);
}
