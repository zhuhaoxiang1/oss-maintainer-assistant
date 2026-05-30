import { UsageError } from "./errors.js";
import { buildTriagePrompt, getSystemPrompt } from "./prompt.js";
import type { TriageProvider, TriageRequest, TriageResult } from "./types.js";

export async function runTriage(
  request: TriageRequest,
  model: string,
  provider: TriageProvider,
  options?: { systemPrompt?: string; triageTemplate?: string },
): Promise<TriageResult> {
  const systemPrompt = getSystemPrompt(options?.systemPrompt);
  const userPrompt = buildTriagePrompt(request, options?.triageTemplate);
  const content = await provider.complete(model, systemPrompt, userPrompt);
  return parseTriageResult(content);
}

export function parseTriageResult(content: string): TriageResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new UsageError("OpenAI response was not valid JSON.");
  }

  if (!isTriageResult(parsed)) {
    throw new UsageError("OpenAI response did not match the expected triage schema.");
  }

  return parsed;
}

function isTriageResult(value: unknown): value is TriageResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const priority = candidate.priority;

  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.labels) &&
    candidate.labels.every((label) => typeof label === "string") &&
    (priority === "low" || priority === "medium" || priority === "high") &&
    typeof candidate.maintainerReply === "string" &&
    typeof candidate.changelogNote === "string"
  );
}
