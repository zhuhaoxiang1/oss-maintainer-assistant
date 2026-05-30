import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMode } from "../src/input.js";

test("resolveMode returns 'issue' when explicitly set", () => {
  assert.equal(resolveMode("issue", "some-file.md"), "issue");
});

test("resolveMode returns 'pr' when explicitly set", () => {
  assert.equal(resolveMode("pr", "some-file.md"), "pr");
});

test("resolveMode auto-detects 'pr' from GitHub pull URL", () => {
  assert.equal(resolveMode("auto", "https://github.com/owner/repo/pull/42"), "pr");
});

test("resolveMode auto-detects 'issue' from GitHub issue URL", () => {
  assert.equal(resolveMode("auto", "https://github.com/owner/repo/issues/42"), "issue");
});

test("resolveMode defaults to 'issue' for non-GitHub paths", () => {
  assert.equal(resolveMode("auto", "local-file.md"), "issue");
});
