import { UsageError } from "./errors.js";

export interface GitHubReference {
  owner: string;
  repo: string;
  type: "issues" | "pull";
  number: number;
}

export function parseGitHubUrl(value: string): GitHubReference {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new UsageError("GitHub input must be a valid URL.");
  }

  if (url.hostname !== "github.com") {
    throw new UsageError("GitHub input must use github.com.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const [owner, repo, type, numberText] = parts;

  if (!owner || !repo || (type !== "issues" && type !== "pull") || !numberText) {
    throw new UsageError("GitHub URL must look like https://github.com/owner/repo/issues/123 or /pull/123.");
  }

  const number = Number(numberText);
  if (!Number.isInteger(number) || number <= 0) {
    throw new UsageError("GitHub issue or PR number must be a positive integer.");
  }

  return { owner, repo, type, number };
}

export function inferModeFromGitHubUrl(value: string): "issue" | "pr" {
  const reference = parseGitHubUrl(value);
  return reference.type === "pull" ? "pr" : "issue";
}

export async function fetchGitHubMarkdown(value: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const reference = parseGitHubUrl(value);
  const apiType = reference.type === "pull" ? "pulls" : "issues";
  const apiUrl = `https://api.github.com/repos/${reference.owner}/${reference.repo}/${apiType}/${reference.number}`;
  const response = await fetchImpl(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "oss-maintainer-assistant"
    }
  });

  if (!response.ok) {
    throw new UsageError(`Could not fetch GitHub item (${response.status} ${response.statusText}).`);
  }

  const data = (await response.json()) as {
    title?: unknown;
    body?: unknown;
    user?: { login?: unknown };
    html_url?: unknown;
  };

  const title = typeof data.title === "string" ? data.title : "(untitled)";
  const body = typeof data.body === "string" && data.body.trim().length > 0 ? data.body : "(no body provided)";
  const author = typeof data.user?.login === "string" ? data.user.login : "unknown";
  const htmlUrl = typeof data.html_url === "string" ? data.html_url : value;

  return [`# ${title}`, "", `Author: ${author}`, `URL: ${htmlUrl}`, "", body].join("\n");
}
