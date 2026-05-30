import { readFile } from "node:fs/promises";
import { UsageError } from "./errors.js";
import { fetchGitHubMarkdown, inferModeFromGitHubUrl } from "./github.js";
import type { AssistantMode, CliOptions, TriageRequest } from "./types.js";

export async function loadTriageRequest(options: CliOptions): Promise<TriageRequest> {
  const body =
    options.source.kind === "file"
      ? await readMarkdownFile(options.source.value)
      : await fetchGitHubMarkdown(options.source.value);

  const mode = resolveMode(options.mode, options.source.value);
  return {
    sourceLabel: options.source.value,
    mode,
    body
  };
}

export function resolveMode(mode: AssistantMode, sourceValue: string): "issue" | "pr" {
  if (mode !== "auto") {
    return mode;
  }

  if (sourceValue.includes("github.com/")) {
    return inferModeFromGitHubUrl(sourceValue);
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
