export type InputSource =
  | {
      kind: "file";
      value: string;
    }
  | {
      kind: "github";
      value: string;
    };

export type AssistantMode = "issue" | "pr" | "auto";

export type OutputFormat = "json" | "markdown" | "slack" | "html" | "csv";

export interface CliOptions {
  source: InputSource;
  mode: AssistantMode;
  dryRun: boolean;
  verbose: boolean;
  model: string;
  format: OutputFormat;
  writeLabels: boolean;
}

export type ParseResult =
  | { kind: "options"; options: CliOptions }
  | { kind: "batch"; sources: string[]; batchFile: string; options: Omit<CliOptions, "source"> }
  | { kind: "init" }
  | { kind: "version" }
  | { kind: "help"; text: string };

export interface TriageRequest {
  sourceLabel: string;
  sourceKind: "file" | "github";
  githubRef?: GitHubReference;
  mode: Exclude<AssistantMode, "auto">;
  body: string;
}

export interface TriageResult {
  summary: string;
  labels: string[];
  priority: "low" | "medium" | "high";
  maintainerReply: string;
  changelogNote: string;
}

export interface TriageProvider {
  complete(model: string, systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface GitHubReference {
  owner: string;
  repo: string;
  type: "issues" | "pull";
  number: number;
}
