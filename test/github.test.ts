import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageError } from "../src/errors.js";
import { fetchGitHubMarkdown, inferModeFromGitHubUrl, parseGitHubUrl } from "../src/github.js";

test("parseGitHubUrl parses issue URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/openai/openai-node/issues/123"), {
    owner: "openai",
    repo: "openai-node",
    type: "issues",
    number: 123,
  });
});

test("parseGitHubUrl parses pull request URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/openai/openai-node/pull/42"), {
    owner: "openai",
    repo: "openai-node",
    type: "pull",
    number: 42,
  });
});

test("inferModeFromGitHubUrl detects pull requests", () => {
  assert.equal(inferModeFromGitHubUrl("https://github.com/openai/openai-node/pull/99"), "pr");
});

test("inferModeFromGitHubUrl detects issues", () => {
  assert.equal(inferModeFromGitHubUrl("https://github.com/openai/openai-node/issues/99"), "issue");
});

test("parseGitHubUrl rejects non-GitHub URLs", () => {
  assert.throws(() => parseGitHubUrl("https://example.com/openai/openai-node/issues/123"), UsageError);
});

test("parseGitHubUrl rejects invalid number", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner/repo/issues/abc"), UsageError);
});

test("parseGitHubUrl rejects negative number", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner/repo/issues/-1"), UsageError);
});

test("parseGitHubUrl rejects zero as number", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner/repo/issues/0"), UsageError);
});

test("parseGitHubUrl rejects missing path parts", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner"), UsageError);
});

test("parseGitHubUrl rejects unsupported type (not issues or pull)", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner/repo/commits/123"), UsageError);
});

test("fetchGitHubMarkdown returns formatted markdown on success", async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        title: "Test Issue",
        body: "This is the body.",
        user: { login: "testuser" },
        html_url: "https://github.com/owner/repo/issues/1",
      }),
    }) as Response;

  const result = await fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch);
  assert.match(result, /# Test Issue/);
  assert.match(result, /Author: testuser/);
  assert.match(result, /This is the body/);
  assert.match(result, /https:\/\/github\.com\/owner\/repo\/issues\/1/);
});

test("fetchGitHubMarkdown throws UsageError on non-ok response", async () => {
  const mockFetch = async () =>
    ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }) as Response;

  await assert.rejects(
    () => fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch),
    UsageError,
  );
});

test("fetchGitHubMarkdown uses '(untitled)' when title is missing", async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        body: "Some body.",
        user: { login: "user" },
        html_url: "https://github.com/owner/repo/issues/1",
      }),
    }) as Response;

  const result = await fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch);
  assert.match(result, /# \(untitled\)/);
});

test("fetchGitHubMarkdown uses '(no body provided)' when body is missing", async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        title: "Issue Title",
        user: { login: "user" },
        html_url: "https://github.com/owner/repo/issues/1",
      }),
    }) as Response;

  const result = await fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch);
  assert.match(result, /\(no body provided\)/);
});
