import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageError } from "../src/errors.js";
import { parseTriageResult } from "../src/triage.js";

test("parseTriageResult parses valid JSON with all fields", () => {
  const result = parseTriageResult(
    JSON.stringify({
      summary: "A bug report about CLI crashes.",
      labels: ["type:bug"],
      priority: "medium",
      maintainerReply: "Thanks for reporting.",
      changelogNote: "Fix CLI crash.",
    }),
  );

  assert.equal(result.summary, "A bug report about CLI crashes.");
  assert.deepEqual(result.labels, ["type:bug"]);
  assert.equal(result.priority, "medium");
});

test("parseTriageResult throws on invalid JSON", () => {
  assert.throws(() => parseTriageResult("not json"), UsageError);
});

test("parseTriageResult throws when summary is missing", () => {
  const bad = JSON.stringify({
    labels: ["type:bug"],
    priority: "low",
    maintainerReply: "hi",
    changelogNote: "note",
  });
  assert.throws(() => parseTriageResult(bad), UsageError);
});

test("parseTriageResult throws when labels is missing", () => {
  const bad = JSON.stringify({
    summary: "hello",
    priority: "low",
    maintainerReply: "hi",
    changelogNote: "note",
  });
  assert.throws(() => parseTriageResult(bad), UsageError);
});

test("parseTriageResult throws when priority is invalid", () => {
  const bad = JSON.stringify({
    summary: "hello",
    labels: [],
    priority: "urgent",
    maintainerReply: "hi",
    changelogNote: "note",
  });
  assert.throws(() => parseTriageResult(bad), UsageError);
});

test("parseTriageResult throws when labels contains non-strings", () => {
  const bad = JSON.stringify({
    summary: "hello",
    labels: [123],
    priority: "low",
    maintainerReply: "hi",
    changelogNote: "note",
  });
  assert.throws(() => parseTriageResult(bad), UsageError);
});

test("parseTriageResult accepts extra fields in response", () => {
  const result = parseTriageResult(
    JSON.stringify({
      summary: "hello",
      labels: [],
      priority: "low",
      maintainerReply: "hi",
      changelogNote: "note",
      extraField: "ignored",
    }),
  );
  assert.equal(result.summary, "hello");
});

test("parseTriageResult throws on null input", () => {
  assert.throws(() => parseTriageResult("null"), UsageError);
});
