import { spawnSync } from "node:child_process";

export function runCommand(command) {
  const result = spawnSync(command, { encoding: "utf8", shell: true });
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}
