import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../src/cli.js";
import { UsageError } from "../src/errors.js";

test("parseArgs accepts a local file source", () => {
  const result = parseArgs(["--file", "examples/issue.md", "--dry-run", "--format", "json"]);

  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.source.kind, "file");
  assert.equal(result.options.source.value, "examples/issue.md");
  assert.equal(result.options.dryRun, true);
  assert.equal(result.options.format, "json");
  assert.equal(result.options.verbose, false);
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
  const result = parseArgs(["--file", "test.md", "--verbose"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.verbose, true);
});

test("parseArgs accepts -v shorthand for verbose", () => {
  const result = parseArgs(["--file", "test.md", "-v"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.verbose, true);
});

test("parseArgs returns version result for --version", () => {
  const result = parseArgs(["--version"]);
  assert.equal(result.kind, "version");
});

test("parseArgs returns version result for -V", () => {
  const result = parseArgs(["-V"]);
  assert.equal(result.kind, "version");
});

test("parseArgs returns help result for --help", () => {
  const result = parseArgs(["--help"]);
  assert.equal(result.kind, "help");
  if (result.kind !== "help") throw new Error("expected help");
  assert.match(result.text, /Usage:/);
});

test("parseArgs returns help result for -h", () => {
  const result = parseArgs(["-h"]);
  assert.equal(result.kind, "help");
});

test("parseArgs accepts --write-labels flag", () => {
  const result = parseArgs(["--file", "test.md", "--write-labels"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.writeLabels, true);
});

test("parseArgs writeLabels defaults to false", () => {
  const result = parseArgs(["--file", "test.md"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.writeLabels, false);
});

test("parseArgs --init returns init result", () => {
  const result = parseArgs(["--init"]);
  assert.equal(result.kind, "init");
});

test("parseArgs --batch returns batch result", () => {
  const result = parseArgs(["--batch", "sources.txt", "--format", "slack"]);
  assert.equal(result.kind, "batch");
  if (result.kind !== "batch") throw new Error("expected batch");
  assert.equal(result.batchFile, "sources.txt");
  assert.equal(result.options.format, "slack");
});

test("parseArgs --batch cannot combine with --file", () => {
  assert.throws(() => parseArgs(["--batch", "sources.txt", "--file", "test.md"]), UsageError);
});

test("parseArgs --batch cannot combine with --github", () => {
  assert.throws(() => parseArgs(["--batch", "sources.txt", "--github", "https://github.com/x/y/issues/1"]), UsageError);
});

test("parseArgs accepts new format values", () => {
  for (const fmt of ["slack", "html", "csv"]) {
    const result = parseArgs(["--file", "test.md", "--format", fmt]);
    assert.equal(result.kind, "options");
    if (result.kind !== "options") throw new Error("expected options");
    assert.equal(result.options.format, fmt);
  }
});

test("parseArgs help text includes new flags", () => {
  const result = parseArgs(["--help"]);
  assert.equal(result.kind, "help");
  if (result.kind !== "help") throw new Error("expected help");
  assert.match(result.text, /--batch/);
  assert.match(result.text, /--write-labels/);
  assert.match(result.text, /--init/);
});
