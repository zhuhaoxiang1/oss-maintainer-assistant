import assert from "node:assert/strict";
import { test } from "node:test";
import { main, parseArgs } from "../src/cli.js";
import { UsageError } from "../src/errors.js";

test("main with --dry-run prints prompt to stdout", async () => {
  const chunks: Buffer[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((chunk: Uint8Array | string) => {
    chunks.push(Buffer.from(chunk));
    return true;
  }) as typeof process.stdout.write;

  try {
    await main(["--file", "examples/issue.md", "--dry-run"]);
    const output = Buffer.concat(chunks).toString("utf8");
    assert.match(output, /Item type:/);
    assert.match(output, /Source:/);
    assert.ok(output.length > 50);
  } finally {
    process.stdout.write = originalWrite;
  }
});

test("parseArgs --help returns help result", () => {
  const result = parseArgs(["--help"]);
  assert.equal(result.kind, "help");
  if (result.kind !== "help") throw new Error("expected help");
  assert.match(result.text, /Usage:/);
  assert.match(result.text, /--file/);
  assert.match(result.text, /--github/);
});

test("parseArgs --version returns version result", () => {
  const result = parseArgs(["--version"]);
  assert.equal(result.kind, "version");
});

test("parseArgs --verbose flag is parsed", () => {
  const result = parseArgs(["--file", "test.md", "--verbose"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.verbose, true);
});

test("parseArgs -v shorthand enables verbose", () => {
  const result = parseArgs(["--file", "test.md", "-v"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.verbose, true);
});

test("parseArgs verbose defaults to false", () => {
  const result = parseArgs(["--file", "test.md"]);
  assert.equal(result.kind, "options");
  if (result.kind !== "options") throw new Error("expected options");
  assert.equal(result.options.verbose, false);
});

test("parseArgs suggests --file for --input", () => {
  assert.throws(
    () => parseArgs(["--input", "test.md"]),
    (err: unknown) => err instanceof UsageError && err.message.includes("Did you mean --file?"),
  );
});

test("parseArgs suggests --github for --url", () => {
  assert.throws(
    () => parseArgs(["--url", "https://github.com/x/y/issues/1"]),
    (err: unknown) => err instanceof UsageError && err.message.includes("Did you mean --github?"),
  );
});
