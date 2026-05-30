import type { TriageRequest } from "./types.js";

const DEFAULT_TEMPLATE = [
  "You are helping an open-source maintainer triage a GitHub item.",
  "Return concise, practical output in valid JSON only.",
  "",
  "Required JSON shape:",
  "{",
  '  "summary": "one or two sentences",',
  '  "labels": ["area:...", "type:..."],',
  '  "priority": "low | medium | high",',
  '  "maintainerReply": "a respectful reply draft",',
  '  "changelogNote": "a short changelog note or empty string"',
  "}",
  "",
  "Item type: {{item_type}}",
  "Source: {{source}}",
  "",
  "Item content:",
  "```markdown",
  "{{body}}",
  "```",
].join("\n");

export function buildTriagePrompt(request: TriageRequest, customTemplate?: string): string {
  const itemName = request.mode === "pr" ? "pull request" : "issue";
  const template = customTemplate ?? DEFAULT_TEMPLATE;

  return template
    .replaceAll("{{item_type}}", itemName)
    .replaceAll("{{source}}", request.sourceLabel)
    .replaceAll("{{body}}", request.body.trim());
}

export function getSystemPrompt(customSystem?: string): string {
  return customSystem ?? "You produce safe, concise maintainer triage notes for open-source projects.";
}
