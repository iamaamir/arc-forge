export default {
  profile: "legacy-migration",
  maxLines: 40,
  allowFactoryObjectParams: true,
  allowClasses: true,
  factoryNamePattern: "^(make|create|from|build|to)[A-Z_]",
  utilityAllowlist: ["clamp", "range", "replace"],
};
