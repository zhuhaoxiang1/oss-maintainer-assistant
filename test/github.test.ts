import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageError } from "../src/errors.js";
import {
  fetchComments,
  fetchGitHubMarkdown,
  fetchPRFiles,
  inferModeFromGitHubUrl,
  parseGitHubUrl,
  setLabels,
} from "../src/github.js";

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

  await assert.rejects(() => fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch), UsageError);
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

test("fetchGitHubMarkdown sends Authorization header when token provided", async () => {
  let capturedHeaders: Record<string, string> = {};
  const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
    return {
      ok: true,
      json: async () => ({
        title: "Test",
        body: "Body",
        user: { login: "user" },
        html_url: "https://github.com/owner/repo/issues/1",
      }),
    } as Response;
  };

  await fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch, "ghp_test123");
  assert.equal(capturedHeaders["Authorization"], "Bearer ghp_test123");
});

test("fetchGitHubMarkdown does not send Authorization header when no token", async () => {
  let capturedHeaders: Record<string, string> = {};
  const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
    return {
      ok: true,
      json: async () => ({
        title: "Test",
        body: "Body",
        user: { login: "user" },
        html_url: "https://github.com/owner/repo/issues/1",
      }),
    } as Response;
  };

  await fetchGitHubMarkdown("https://github.com/owner/repo/issues/1", mockFetch);
  assert.equal(capturedHeaders["Authorization"], undefined);
});

test("fetchPRFiles returns formatted file list", async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => [
        { filename: "src/cli.ts", status: "modified", additions: 10, deletions: 5, patch: "@@ -1,3 +1,3 @@" },
        { filename: "README.md", status: "added", additions: 20, deletions: 0 },
      ],
    }) as Response;

  const ref = { owner: "owner", repo: "repo", type: "pull" as const, number: 1 };
  const result = await fetchPRFiles(ref, mockFetch);
  assert.match(result, /src\/cli\.ts/);
  assert.match(result, /README\.md/);
  assert.match(result, /\+10\/-5/);
});

test("fetchPRFiles throws on non-ok response", async () => {
  const mockFetch = async () => ({ ok: false, status: 404, statusText: "Not Found" }) as Response;
  const ref = { owner: "owner", repo: "repo", type: "pull" as const, number: 1 };
  await assert.rejects(() => fetchPRFiles(ref, mockFetch), UsageError);
});

test("fetchComments returns formatted comments", async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => [
        { user: { login: "alice" }, body: "This looks good!" },
        { user: { login: "bob" }, body: "Please fix the typo." },
      ],
    }) as Response;

  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 1 };
  const result = await fetchComments(ref, mockFetch);
  assert.match(result, /@alice/);
  assert.match(result, /This looks good!/);
  assert.match(result, /@bob/);
});

test("fetchComments returns empty string when no comments", async () => {
  const mockFetch = async () => ({ ok: true, json: async () => [] }) as Response;
  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 1 };
  const result = await fetchComments(ref, mockFetch);
  assert.equal(result, "");
});

test("fetchComments throws on non-ok response", async () => {
  const mockFetch = async () => ({ ok: false, status: 403, statusText: "Forbidden" }) as Response;
  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 1 };
  await assert.rejects(() => fetchComments(ref, mockFetch), UsageError);
});

test("setLabels sends PUT request with labels", async () => {
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";
  const mockFetch = async (url: URL | RequestInfo, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedMethod = init?.method ?? "";
    capturedBody = init?.body as string;
    return { ok: true, json: async () => ({}) } as Response;
  };

  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 42 };
  await setLabels(ref, ["type:bug", "area:cli"], "ghp_test", mockFetch);

  assert.equal(capturedMethod, "PUT");
  assert.match(capturedUrl, /\/issues\/42\/labels/);
  const body = JSON.parse(capturedBody);
  assert.deepEqual(body.labels, ["type:bug", "area:cli"]);
});

test("setLabels sends Authorization header", async () => {
  let capturedHeaders: Record<string, string> = {};
  const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
    return { ok: true, json: async () => ({}) } as Response;
  };

  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 1 };
  await setLabels(ref, ["bug"], "ghp_token123", mockFetch);
  assert.equal(capturedHeaders["Authorization"], "Bearer ghp_token123");
});

test("setLabels throws on non-ok response", async () => {
  const mockFetch = async () => ({ ok: false, status: 404, statusText: "Not Found" }) as Response;
  const ref = { owner: "owner", repo: "repo", type: "issues" as const, number: 1 };
  await assert.rejects(() => setLabels(ref, ["bug"], "token", mockFetch), UsageError);
});
