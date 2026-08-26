import { spawnSync } from "node:child_process";

export const defaultCommandTimeoutSeconds = 300;
const maxBufferBytes = 10 * 1024 * 1024;

// Root-cause notes on "chatty output silently truncated" reports (verified
// empirically on Node v24, darwin):
// 1. spawnSync DOES honor maxBuffer on this Node line — there is no hidden 64KB
//    cap. But maxBuffer is a COMBINED budget across stdout and stderr (5MB+5MB
//    passes at a 10MB limit; 6MB+6MB does not). Exceeding it kills the child,
//    sets an ENOBUFS error, and keeps whatever was drained before the kill.
//    Callers must surface that partial output (see check.mjs
//    commandGateFailure) instead of reporting only "could not run", which used
//    to discard every byte of diagnostics.
// 2. A child that ends abruptly with process.exit() while stdout is still
//    backpressured into its internal queue loses the unflushed remainder
//    itself (observed: 12MB written, 0-320KB delivered) — nothing the parent
//    can do; chatty commands should end with process.exitCode instead.
// A timeout kill likewise retains only what drained in time.

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
      status: raw.status ?? 1,
      output: `${raw.stdout ?? ""}${raw.stderr ?? ""}`.trim(),
      error: raw.error,
      truncated: raw.error.code === "ENOBUFS",
      timedOut: raw.error.code === "ETIMEDOUT",
      timeoutSeconds,
    };
  }
  return {
    status: raw.status ?? 1,
    output: `${raw.stdout ?? ""}${raw.stderr ?? ""}`.trim(),
  };
}
