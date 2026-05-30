import type { OutputFormat, TriageResult } from "./types.js";

export function formatResult(result: TriageResult, format: OutputFormat): string {
  switch (format) {
    case "json":
      return formatJson(result);
    case "markdown":
      return formatMarkdown(result);
    case "slack":
      return formatSlack(result);
    case "html":
      return formatHtml(result);
    case "csv":
      return formatCsv(result);
  }
}

function formatJson(result: TriageResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

function formatMarkdown(result: TriageResult): string {
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
    "",
  ].join("\n");
}

function formatSlack(result: TriageResult): string {
  const priorityEmoji =
    result.priority === "high"
      ? ":rotating_light:"
      : result.priority === "medium"
        ? ":warning:"
        : ":information_source:";
  const labels = result.labels.length > 0 ? result.labels.map((l) => `\`${l}\``).join(" ") : "_none_";

  return [
    `*Triage Result*`,
    "",
    `*Summary:* ${result.summary}`,
    `*Priority:* ${priorityEmoji} ${result.priority}`,
    `*Labels:* ${labels}`,
    "",
    `*Maintainer Reply:*> ${result.maintainerReply}`,
    "",
    `*Changelog Note:* ${result.changelogNote || "n/a"}`,
    "",
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatHtml(result: TriageResult): string {
  const labelBadges = result.labels.map((l) => `<span class="label">${escapeHtml(l)}</span>`).join(" ");

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8">`,
    `  <title>Triage Result</title>`,
    `  <style>`,
    `    body { font-family: system-ui, sans-serif; max-width: 680px; margin: 2rem auto; line-height: 1.6; }`,
    `    .label { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e1ecf4; color: #39739d; font-size: 0.85em; margin-right: 4px; }`,
    `    .priority { font-weight: bold; }`,
    `    .priority-high { color: #d32f2f; }`,
    `    .priority-medium { color: #f57c00; }`,
    `    .priority-low { color: #388e3c; }`,
    `    section { margin-bottom: 1.5rem; }`,
    `    h1 { border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <h1>Triage Result</h1>`,
    `  <section>`,
    `    <h2>Summary</h2>`,
    `    <p>${escapeHtml(result.summary)}</p>`,
    `  </section>`,
    `  <section>`,
    `    <h2>Labels</h2>`,
    `    <p>${labelBadges || "<em>none</em>"}</p>`,
    `  </section>`,
    `  <section>`,
    `    <h2>Priority</h2>`,
    `    <p class="priority priority-${result.priority}">${result.priority}</p>`,
    `  </section>`,
    `  <section>`,
    `    <h2>Maintainer Reply</h2>`,
    `    <p>${escapeHtml(result.maintainerReply)}</p>`,
    `  </section>`,
    `  <section>`,
    `    <h2>Changelog Note</h2>`,
    `    <p>${escapeHtml(result.changelogNote || "n/a")}</p>`,
    `  </section>`,
    `</body>`,
    `</html>`,
    "",
  ].join("\n");
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatCsv(result: TriageResult): string {
  const header = "summary,labels,priority,maintainer_reply,changelog_note";
  const row = [
    escapeCsvField(result.summary),
    escapeCsvField(result.labels.join(";")),
    result.priority,
    escapeCsvField(result.maintainerReply),
    escapeCsvField(result.changelogNote),
  ].join(",");

  return `${header}\n${row}\n`;
}
