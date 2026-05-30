import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMode } from "../src/input.js";

test("resolveMode returns 'issue' when explicitly set", () => {
  assert.equal(resolveMode("issue", { kind: "file", value: "some-file.md" }), "issue");
});

test("resolveMode returns 'pr' when explicitly set", () => {
  assert.equal(resolveMode("pr", { kind: "file", value: "some-file.md" }), "pr");
});

test("resolveMode auto-detects 'pr' from GitHub pull URL", () => {
  assert.equal(resolveMode("auto", { kind: "github", value: "https://github.com/owner/repo/pull/42" }), "pr");
});

test("resolveMode auto-detects 'issue' from GitHub issue URL", () => {
  assert.equal(resolveMode("auto", { kind: "github", value: "https://github.com/owner/repo/issues/42" }), "issue");
});

test("resolveMode defaults to 'issue' for file sources", () => {
  assert.equal(resolveMode("auto", { kind: "file", value: "local-file.md" }), "issue");
});
