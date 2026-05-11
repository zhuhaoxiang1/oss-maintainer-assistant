import type { TriageResult } from "./types.js";

export function formatResult(result: TriageResult, format: "json" | "markdown"): string {
  if (format === "json") {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  return [
    `## Summary`,
    result.summary,
    "",
    "## Labels",
    result.labels.length > 0 ? result.labels.map((label) => `- ${label}`).join("\n") : "- none",
    "",
    "## Priority",
    result.priority,
    "",
    "## Maintainer Reply",
    result.maintainerReply,
    "",
    "## Changelog Note",
    result.changelogNote || "n/a",
    ""
  ].join("\n");
}
