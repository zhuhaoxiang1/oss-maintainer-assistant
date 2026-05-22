import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageError } from "../src/errors.js";

test("UsageError is an instance of Error", () => {
  const error = new UsageError("something went wrong");
  assert.ok(error instanceof Error);
});

test("UsageError has name set to 'UsageError'", () => {
  const error = new UsageError("something went wrong");
  assert.equal(error.name, "UsageError");
});

test("UsageError preserves the message", () => {
  const error = new UsageError("specific error message");
  assert.equal(error.message, "specific error message");
});
