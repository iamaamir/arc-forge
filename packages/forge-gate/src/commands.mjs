import { spawnSync } from "node:child_process";

export const defaultCommandTimeoutSeconds = 300;
const maxBufferBytes = 10 * 1024 * 1024;

export function runCommand(command, timeoutSeconds = defaultCommandTimeoutSeconds) {
  return toCommandResult(
    spawnSync(command, {
      encoding: "utf8",
      shell: true,
      timeout: timeoutSeconds * 1000,
      maxBuffer: maxBufferBytes,
    }),
    timeoutSeconds,
  );
}

export function toCommandResult(raw, timeoutSeconds = defaultCommandTimeoutSeconds) {
  if (raw.error) {
    return {
      status: 1,
      output: `${raw.stdout ?? ""}${raw.stderr ?? ""}`.trim(),
      error: raw.error,
      timedOut: raw.error.code === "ETIMEDOUT",
      timeoutSeconds,
    };
  }
  return {
    status: raw.status ?? 1,
    output: `${raw.stdout ?? ""}${raw.stderr ?? ""}`.trim(),
  };
}
