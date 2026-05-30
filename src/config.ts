import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { AssistantMode, OutputFormat } from "./types.js";

export interface OmaConfig {
  model?: string;
  format?: OutputFormat;
  mode?: AssistantMode;
  githubToken?: string;
  prompts?: {
    system?: string;
    triage?: string;
  };
}

const CONFIG_FILE = ".oma.json";

export async function loadConfig(cwd: string = process.cwd()): Promise<OmaConfig> {
  let dir = resolve(cwd);
  const root = resolve("/");

  while (true) {
    const filePath = resolve(dir, CONFIG_FILE);
    try {
      const content = await readFile(filePath, "utf8");
      const parsed = JSON.parse(content) as unknown;
      if (isOmaConfig(parsed)) {
        return parsed;
      }
    } catch {
      // File not found or invalid, continue walking up
    }

    const parent = dirname(dir);
    if (parent === dir || dir === root) {
      break;
    }
    dir = parent;
  }

  return {};
}

function isOmaConfig(value: unknown): value is OmaConfig {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  if (obj.model !== undefined && typeof obj.model !== "string") return false;
  const validFormats = ["json", "markdown", "slack", "html", "csv"];
  if (obj.format !== undefined && !validFormats.includes(obj.format as string)) return false;
  if (obj.mode !== undefined && obj.mode !== "issue" && obj.mode !== "pr" && obj.mode !== "auto") return false;
  if (obj.githubToken !== undefined && typeof obj.githubToken !== "string") return false;

  if (obj.prompts !== undefined) {
    if (typeof obj.prompts !== "object" || obj.prompts === null) return false;
    const prompts = obj.prompts as Record<string, unknown>;
    if (prompts.system !== undefined && typeof prompts.system !== "string") return false;
    if (prompts.triage !== undefined && typeof prompts.triage !== "string") return false;
  }

  return true;
}
