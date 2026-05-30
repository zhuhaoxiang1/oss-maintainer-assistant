import type { TriageRequest } from "./types.js";

export function buildTriagePrompt(request: TriageRequest): string {
  const itemName = request.mode === "pr" ? "pull request" : "issue";

  return [
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
    `Item type: ${itemName}`,
    `Source: ${request.sourceLabel}`,
    "",
    "Item content:",
    "```markdown",
    request.body.trim(),
    "```"
  ].join("\n");
}
