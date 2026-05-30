import assert from "node:assert/strict";
import { test } from "node:test";
import { formatResult } from "../src/format.js";
import type { TriageResult } from "../src/types.js";

const sampleResult: TriageResult = {
  summary: "The CLI crashes when given empty input.",
  labels: ["type:bug", "area:cli"],
  priority: "high",
  maintainerReply: "Thanks for the report. We will investigate.",
  changelogNote: "Fix crash on empty input.",
};

test("formatResult produces valid JSON in json mode", () => {
  const output = formatResult(sampleResult, "json");
  const parsed = JSON.parse(output);
  assert.equal(parsed.summary, sampleResult.summary);
  assert.equal(parsed.priority, "high");
  assert.deepEqual(parsed.labels, ["type:bug", "area:cli"]);
});

test("formatResult produces JSON ending with newline", () => {
  const output = formatResult(sampleResult, "json");
  assert.ok(output.endsWith("\n"));
});

test("formatResult markdown contains all sections", () => {
  const output = formatResult(sampleResult, "markdown");
  assert.match(output, /## Summary/);
  assert.match(output, /## Labels/);
  assert.match(output, /## Priority/);
  assert.match(output, /## Maintainer Reply/);
  assert.match(output, /## Changelog Note/);
});

test("formatResult markdown includes result values", () => {
  const output = formatResult(sampleResult, "markdown");
  assert.match(output, /The CLI crashes when given empty input/);
  assert.match(output, /type:bug/);
  assert.match(output, /area:cli/);
  assert.match(output, /high/);
  assert.match(output, /Fix crash on empty input/);
});

test("formatResult markdown renders empty labels as '- none'", () => {
  const noLabels = { ...sampleResult, labels: [] };
  const output = formatResult(noLabels, "markdown");
  assert.match(output, /- none/);
});

test("formatResult markdown renders empty changelogNote as 'n/a'", () => {
  const noNote = { ...sampleResult, changelogNote: "" };
  const output = formatResult(noNote, "markdown");
  assert.match(output, /n\/a/);
});

test("formatResult markdown renders labels as bullet list", () => {
  const output = formatResult(sampleResult, "markdown");
  assert.match(output, /- type:bug/);
  assert.match(output, /- area:cli/);
});
