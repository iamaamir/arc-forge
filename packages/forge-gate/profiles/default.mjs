export default {
  profile: "default",
  roots: ["src"],
  extensions: [".js", ".mjs", ".cjs", ".jsx"],
  ignore: ["node_modules", ".git", "dist", "coverage", "reports"],
  crapThreshold: 8,
  coverageFinalPath: "coverage/coverage-final.json",
  mutationReportPath: "reports/mutation/mutation.json",
  mutationScoreThreshold: 85,
  testCommand: "",
  qaCommand: "",
  commandTimeoutSeconds: 300,
};
