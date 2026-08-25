import { spawnSync } from "node:child_process";

export function runCommand(command) {
  return toCommandResult(spawnSync(command, { encoding: "utf8", shell: true }));
}

export function toCommandResult(raw) {
  return {
    status: raw.status ?? 1,
    output: `${raw.stdout ?? ""}${raw.stderr ?? ""}`.trim(),
  };
}
