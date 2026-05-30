import { UsageError } from "./errors.js";
import type { GitHubReference } from "./types.js";

export type { GitHubReference } from "./types.js";

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

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oss-maintainer-assistant",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchGitHubMarkdown(
  value: string,
  fetchImpl: typeof fetch = fetch,
  token?: string,
): Promise<string> {
  const reference = parseGitHubUrl(value);
  const apiType = reference.type === "pull" ? "pulls" : "issues";
  const apiUrl = `https://api.github.com/repos/${reference.owner}/${reference.repo}/${apiType}/${reference.number}`;
  const response = await fetchImpl(apiUrl, { headers: buildHeaders(token) });

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

export async function fetchPRFiles(
  ref: GitHubReference,
  fetchImpl: typeof fetch = fetch,
  token?: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}/files?per_page=100`;
  const response = await fetchImpl(url, { headers: buildHeaders(token) });

  if (!response.ok) {
    throw new UsageError(`Could not fetch PR files (${response.status} ${response.statusText}).`);
  }

  const files = (await response.json()) as Array<{
    filename?: unknown;
    status?: unknown;
    additions?: unknown;
    deletions?: unknown;
    patch?: unknown;
  }>;

  if (!Array.isArray(files) || files.length === 0) {
    return "(no changed files)";
  }

  const sections = files.map((file) => {
    const name = typeof file.filename === "string" ? file.filename : "unknown";
    const status = typeof file.status === "string" ? file.status : "modified";
    const adds = typeof file.additions === "number" ? file.additions : 0;
    const dels = typeof file.deletions === "number" ? file.deletions : 0;
    const patch = typeof file.patch === "string" ? file.patch : "";

    const header = `### ${name} (${status}, +${adds}/-${dels})`;
    return patch ? `${header}\n\`\`\`diff\n${patch}\n\`\`\`` : header;
  });

  return sections.join("\n\n");
}

export async function fetchComments(
  ref: GitHubReference,
  fetchImpl: typeof fetch = fetch,
  token?: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${ref.number}/comments?per_page=50`;
  const response = await fetchImpl(url, { headers: buildHeaders(token) });

  if (!response.ok) {
    throw new UsageError(`Could not fetch comments (${response.status} ${response.statusText}).`);
  }

  const comments = (await response.json()) as Array<{
    user?: { login?: unknown };
    body?: unknown;
  }>;

  if (!Array.isArray(comments) || comments.length === 0) {
    return "";
  }

  const sections = comments.map((comment) => {
    const author = typeof comment.user?.login === "string" ? comment.user.login : "unknown";
    const body = typeof comment.body === "string" ? comment.body : "(empty)";
    return `### @${author}\n${body}`;
  });

  return sections.join("\n\n");
}

export async function setLabels(
  ref: GitHubReference,
  labels: string[],
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${ref.number}/labels`;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: {
      ...buildHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ labels }),
  });

  if (!response.ok) {
    throw new UsageError(`Could not set labels (${response.status} ${response.statusText}).`);
  }
}
