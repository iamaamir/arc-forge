import { analyze as analyzeJavaScript } from "./javascript.mjs";
import { analyze as analyzeTypeScript } from "./typescript.mjs";
import { SetupError } from "../errors.mjs";

const PARSERS = new Map([
  [".js", analyzeJavaScript],
  [".mjs", analyzeJavaScript],
  [".cjs", analyzeJavaScript],
  [".ts", analyzeTypeScript],
  [".mts", analyzeTypeScript],
  [".cts", analyzeTypeScript],
]);

export function getParser(extension) {
  const parser = PARSERS.get(extension);
  if (!parser) {
    throw new SetupError(
      `no parser for extension "${extension}". Supported: ${[...PARSERS.keys()].join(", ")}. ` +
        ".jsx/.tsx are not supported.",
    );
  }
  return parser;
}
