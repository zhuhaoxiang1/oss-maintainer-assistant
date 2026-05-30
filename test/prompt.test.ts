import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTriagePrompt, getSystemPrompt } from "../src/prompt.js";
import { parseTriageResult } from "../src/triage.js";

test("buildTriagePrompt includes source, type, and content", () => {
  const prompt = buildTriagePrompt({
    sourceLabel: "examples/issue.md",
    sourceKind: "file",
    mode: "issue",
    body: "# Bug\nThe CLI crashes.",
  });

  assert.match(prompt, /Item type: issue/);
  assert.match(prompt, /Source: examples\/issue.md/);
  assert.match(prompt, /The CLI crashes/);
});

test("buildTriagePrompt uses 'pull request' for PR mode", () => {
  const prompt = buildTriagePrompt({
    sourceLabel: "https://github.com/owner/repo/pull/1",
    sourceKind: "github",
    mode: "pr",
    body: "# PR\nSome changes.",
  });

  assert.match(prompt, /Item type: pull request/);
});

test("buildTriagePrompt supports custom template", () => {
  const template = "Analyze this {{item_type}} from {{source}}:\n{{body}}";
  const prompt = buildTriagePrompt(
    {
      sourceLabel: "test.md",
      sourceKind: "file",
      mode: "issue",
      body: "Hello world",
    },
    template,
  );

  assert.equal(prompt, "Analyze this issue from test.md:\nHello world");
});

test("getSystemPrompt returns default when no custom prompt", () => {
  const prompt = getSystemPrompt();
  assert.match(prompt, /maintainer triage/);
});

test("getSystemPrompt returns custom prompt when provided", () => {
  const prompt = getSystemPrompt("You are a Rust expert.");
  assert.equal(prompt, "You are a Rust expert.");
});

test("parseTriageResult validates the expected schema", () => {
  const result = parseTriageResult(
    JSON.stringify({
      summary: "The report describes a CLI crash.",
      labels: ["type:bug", "area:cli"],
      priority: "high",
      maintainerReply: "Thanks for the report. Could you share the command output?",
      changelogNote: "Fix CLI crash when parsing empty input.",
    }),
  );

  assert.equal(result.priority, "high");
  assert.deepEqual(result.labels, ["type:bug", "area:cli"]);
});
