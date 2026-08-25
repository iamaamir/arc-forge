// Deliberate violation: cli must not import core directly. This fixture
// exists to prove the deps gate bites — tests/deps.test.mjs asserts it fails.
import { ok } from "../core/index.js";

export function run() {
  return ok();
}
