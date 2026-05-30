import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageError } from "../src/errors.js";
import { parseTriageResult, runTriage } from "../src/triage.js";
import type { TriageProvider, TriageRequest } from "../src/types.js";

const sampleRequest: TriageRequest = {
  sourceLabel: "test.md",
  sourceKind: "file",
  mode: "issue",
  body: "# Bug report\nThe app crashes.",
};

const validResponse = JSON.stringify({
  summary: "A bug report about app crashes.",
  labels: ["type:bug"],
  priority: "medium",
  maintainerReply: "Thanks for reporting.",
  changelogNote: "Fix crash.",
});

function mockProvider(response: string): TriageProvider {
  return {
    async complete(): Promise<string> {
      return response;
    },
  };
}

test("runTriage calls provider and returns parsed result", async () => {
  const provider = mockProvider(validResponse);
  const result = await runTriage(sampleRequest, "test-model", provider);
  assert.equal(result.summary, "A bug report about app crashes.");
  assert.equal(result.priority, "medium");
  assert.deepEqual(result.labels, ["type:bug"]);
});

test("runTriage passes model and prompts to provider", async () => {
  let capturedModel = "";
  let capturedSystem = "";
  let capturedUser = "";
  const provider: TriageProvider = {
    async complete(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
      capturedModel = model;
      capturedSystem = systemPrompt;
      capturedUser = userPrompt;
      return validResponse;
    },
  };
  await runTriage(sampleRequest, "gpt-4.1-mini", provider);
  assert.equal(capturedModel, "gpt-4.1-mini");
  assert.match(capturedSystem, /maintainer triage/);
  assert.match(capturedUser, /Bug report/);
});

test("runTriage throws when provider returns invalid JSON", async () => {
  const provider = mockProvider("not json");
  await assert.rejects(() => runTriage(sampleRequest, "test", provider), UsageError);
});

test("runTriage throws when provider returns invalid schema", async () => {
  const provider = mockProvider(JSON.stringify({ summary: "hello" }));
  await assert.rejects(() => runTriage(sampleRequest, "test", provider), UsageError);
});

test("parseTriageResult parses valid JSON with all fields", () => {
  const result = parseTriageResult(validResponse);
  assert.equal(result.summary, "A bug report about app crashes.");
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
