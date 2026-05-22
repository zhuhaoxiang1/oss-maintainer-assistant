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

test("parseArgs --help throws UsageError", () => {
  assert.throws(() => parseArgs(["--help"]), UsageError);
});

test("parseArgs --version prints and exits", () => {
  const originalWrite = process.stdout.write.bind(process.stdout);
  const originalExit = process.exit.bind(process.exit);
  let output = "";
  let exitCalled = false;

  process.stdout.write = ((chunk: Uint8Array | string) => {
    output += chunk.toString();
    return true;
  }) as typeof process.stdout.write;

  process.exit = (() => {
    exitCalled = true;
    return undefined as never;
  }) as typeof process.exit;

  try {
    parseArgs(["--version"]);
  } finally {
    process.stdout.write = originalWrite;
    process.exit = originalExit;
  }

  assert.ok(exitCalled, "process.exit should have been called");
  assert.match(output, /^\d+\.\d+\.\d+/);
});

test("parseArgs --verbose flag is parsed", () => {
  const options = parseArgs(["--file", "test.md", "--verbose"]);
  assert.equal(options.verbose, true);
});

test("parseArgs -v shorthand enables verbose", () => {
  const options = parseArgs(["--file", "test.md", "-v"]);
  assert.equal(options.verbose, true);
});

test("parseArgs verbose defaults to false", () => {
  const options = parseArgs(["--file", "test.md"]);
  assert.equal(options.verbose, false);
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
