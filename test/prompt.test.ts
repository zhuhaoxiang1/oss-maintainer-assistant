import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTriagePrompt } from "../src/prompt.js";
import { parseTriageResult } from "../src/triage.js";

test("buildTriagePrompt includes source, type, and content", () => {
  const prompt = buildTriagePrompt({
    sourceLabel: "examples/issue.md",
    mode: "issue",
    body: "# Bug\nThe CLI crashes."
  });

  assert.match(prompt, /Item type: issue/);
  assert.match(prompt, /Source: examples\/issue.md/);
  assert.match(prompt, /The CLI crashes/);
});

test("parseTriageResult validates the expected schema", () => {
  const result = parseTriageResult(
    JSON.stringify({
      summary: "The report describes a CLI crash.",
      labels: ["type:bug", "area:cli"],
      priority: "high",
      maintainerReply: "Thanks for the report. Could you share the command output?",
      changelogNote: "Fix CLI crash when parsing empty input."
    })
  );

  assert.equal(result.priority, "high");
  assert.deepEqual(result.labels, ["type:bug", "area:cli"]);
});
