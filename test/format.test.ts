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

test("formatResult slack contains summary and priority emoji", () => {
  const output = formatResult(sampleResult, "slack");
  assert.match(output, /\*Triage Result\*/);
  assert.match(output, /The CLI crashes when given empty input/);
  assert.match(output, /:rotating_light:.*high/);
  assert.match(output, /`type:bug`/);
  assert.match(output, /`area:cli`/);
});

test("formatResult slack uses info emoji for low priority", () => {
  const lowPriority = { ...sampleResult, priority: "low" as const };
  const output = formatResult(lowPriority, "slack");
  assert.match(output, /:information_source:.*low/);
});

test("formatResult slack uses warning emoji for medium priority", () => {
  const medPriority = { ...sampleResult, priority: "medium" as const };
  const output = formatResult(medPriority, "slack");
  assert.match(output, /:warning:.*medium/);
});

test("formatResult slack renders empty labels as _none_", () => {
  const noLabels = { ...sampleResult, labels: [] };
  const output = formatResult(noLabels, "slack");
  assert.match(output, /_none_/);
});

test("formatResult html produces valid HTML structure", () => {
  const output = formatResult(sampleResult, "html");
  assert.match(output, /<!DOCTYPE html>/);
  assert.match(output, /<html lang="en">/);
  assert.match(output, /<\/html>/);
  assert.match(output, /The CLI crashes when given empty input/);
  assert.match(output, /type:bug/);
  assert.match(output, /area:cli/);
  assert.match(output, /priority-high/);
});

test("formatResult html escapes HTML entities in content", () => {
  const withHtml = { ...sampleResult, summary: "Bug with <script>alert('xss')</script>" };
  const output = formatResult(withHtml, "html");
  assert.match(output, /&lt;script&gt;/);
  assert.doesNotMatch(output, /<script>/);
});

test("formatResult html renders label badges", () => {
  const output = formatResult(sampleResult, "html");
  assert.match(output, /class="label"/);
});

test("formatResult csv has header and data row", () => {
  const output = formatResult(sampleResult, "csv");
  const lines = output.split("\n").filter((l) => l.length > 0);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /summary,labels,priority,maintainer_reply,changelog_note/);
  assert.match(lines[1], /high/);
});

test("formatResult csv escapes fields with commas", () => {
  const withComma = { ...sampleResult, summary: "Bug, crash on startup" };
  const output = formatResult(withComma, "csv");
  assert.match(output, /"Bug, crash on startup"/);
});

test("formatResult csv joins labels with semicolons", () => {
  const output = formatResult(sampleResult, "csv");
  assert.match(output, /type:bug;area:cli/);
});
