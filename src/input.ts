import { readFile } from "node:fs/promises";
import { UsageError } from "./errors.js";
import { fetchComments, fetchGitHubMarkdown, inferModeFromGitHubUrl, fetchPRFiles, parseGitHubUrl } from "./github.js";
import type { AssistantMode, CliOptions, InputSource, TriageRequest } from "./types.js";

export async function loadTriageRequest(options: CliOptions): Promise<TriageRequest> {
  const token = process.env.GITHUB_TOKEN;

  if (options.verbose && token) {
    process.stderr.write("[verbose] GITHUB_TOKEN is set, using authenticated requests\n");
  }

  let body: string;

  if (options.source.kind === "file") {
    body = await readMarkdownFile(options.source.value);
  } else {
    body = await fetchGitHubMarkdown(options.source.value, fetch, token);
  }

  const mode = resolveMode(options.mode, options.source);

  const request: TriageRequest = {
    sourceLabel: options.source.value,
    sourceKind: options.source.kind,
    mode,
    body,
  };

  if (options.source.kind === "github") {
    const ref = parseGitHubUrl(options.source.value);
    request.githubRef = ref;

    // Enrich PR mode with diff and comments
    if (mode === "pr") {
      try {
        const files = await fetchPRFiles(ref, fetch, token);
        body += `\n\n## Changed Files\n\n${files}`;
      } catch {
        // Non-fatal: PR files may not be available
      }
    }

    // Fetch comments for richer context
    try {
      const comments = await fetchComments(ref, fetch, token);
      if (comments) {
        body += `\n\n## Comments\n\n${comments}`;
      }
    } catch {
      // Non-fatal: comments may not be available
    }

    request.body = body;
  }

  return request;
}

export function resolveMode(mode: AssistantMode, source: InputSource): "issue" | "pr" {
  if (mode !== "auto") {
    return mode;
  }

  if (source.kind === "github") {
    return inferModeFromGitHubUrl(source.value);
  }

  return "issue";
}

async function readMarkdownFile(path: string): Promise<string> {
  const body = await readFile(path, "utf8").catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    throw new UsageError(`Could not read input file: ${detail}`);
  });

  if (body.trim().length === 0) {
    throw new UsageError("Input file is empty.");
  }

  return body;
}
