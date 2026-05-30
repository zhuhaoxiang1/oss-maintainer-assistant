import OpenAI from "openai";
import { UsageError } from "./errors.js";
import { buildTriagePrompt } from "./prompt.js";
import type { TriageRequest, TriageResult } from "./types.js";

export async function runTriage(request: TriageRequest, model: string): Promise<TriageResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new UsageError("OPENAI_API_KEY is required unless you run with --dry-run.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You produce safe, concise maintainer triage notes for open-source projects."
      },
      {
        role: "user",
        content: buildTriagePrompt(request)
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new UsageError("OpenAI returned an empty response.");
  }

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
