import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../src/cli.js";
import { UsageError } from "../src/errors.js";

test("parseArgs accepts a local file source", () => {
  const options = parseArgs(["--file", "examples/issue.md", "--dry-run", "--format", "json"]);

  assert.equal(options.source.kind, "file");
  assert.equal(options.source.value, "examples/issue.md");
  assert.equal(options.dryRun, true);
  assert.equal(options.format, "json");
  assert.equal(options.verbose, false);
});

test("parseArgs rejects missing input source", () => {
  assert.throws(() => parseArgs(["--dry-run"]), UsageError);
});

test("parseArgs rejects multiple input sources", () => {
  assert.throws(
    () => parseArgs(["--file", "examples/issue.md", "--github", "https://github.com/openai/openai-node/issues/1"]),
    UsageError,
  );
});

test("parseArgs accepts --verbose flag", () => {
  const options = parseArgs(["--file", "test.md", "--verbose"]);
  assert.equal(options.verbose, true);
});

test("parseArgs accepts -v shorthand for verbose", () => {
  const options = parseArgs(["--file", "test.md", "-v"]);
  assert.equal(options.verbose, true);
});
