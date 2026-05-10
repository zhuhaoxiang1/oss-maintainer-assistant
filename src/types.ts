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

export interface CliOptions {
  source: InputSource;
  mode: AssistantMode;
  dryRun: boolean;
  verbose: boolean;
  model: string;
  format: "json" | "markdown";
}

export interface TriageRequest {
  sourceLabel: string;
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
