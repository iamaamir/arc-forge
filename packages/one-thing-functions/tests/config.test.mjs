import test from "node:test";
import assert from "node:assert/strict";
import { mergeConfig } from "../src/config.mjs";

const profile = (name) => mergeConfig({ profile: name });

test("fp-first is default", () => {
  assert.equal(mergeConfig().profile, "fp-first");
  assert.equal(mergeConfig().allowClasses, false);
});

test("oo-friendly enables classes", () => {
  assert.equal(profile("oo-friendly").allowClasses, true);
});

test("legacy migration relaxes line limit", () => {
  assert.equal(profile("legacy-migration").maxLines, 40);
});
