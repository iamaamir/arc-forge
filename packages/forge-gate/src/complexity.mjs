import { getParser } from "./parsers/index.mjs";

export function analyzeFunctions(source, options = {}) {
  const { extension = ".js", filename } = typeof options === "string" ? { extension: options } : options;
  return getParser(extension)(source, { filename });
}
