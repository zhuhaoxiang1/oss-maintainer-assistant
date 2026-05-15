#!/usr/bin/env node
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { UsageError } from "./errors.js";
import { formatResult } from "./format.js";
import { loadTriageRequest } from "./input.js";
import { buildTriagePrompt } from "./prompt.js";
import { runTriage } from "./triage.js";
import type { AssistantMode, CliOptions } from "./types.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

const DEFAULT_MODEL = "gpt-4.1-mini";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const request = await loadTriageRequest(options);

  if (options.verbose) {
    process.stderr.write(`[verbose] mode=${request.mode} model=${options.model} source=${options.source.kind}:${options.source.value}\n`);
  }

  if (options.dryRun) {
    process.stdout.write(`${buildTriagePrompt(request)}\n`);
    return;
  }

  const result = await runTriage(request, options.model);
  process.stdout.write(formatResult(result, options.format));
}

export function parseArgs(argv: string[]): CliOptions {
  let sourceFile: string | undefined;
  let githubUrl: string | undefined;
  let mode: AssistantMode = "auto";
  let dryRun = false;
  let verbose = false;
  let model = DEFAULT_MODEL;
  let format: "json" | "markdown" = "markdown";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--file":
        sourceFile = readValue(arg, next);
        index += 1;
        break;
      case "--github":
        githubUrl = readValue(arg, next);
        index += 1;
        break;
      case "--mode":
        mode = parseMode(readValue(arg, next));
        index += 1;
        break;
      case "--model":
        model = readValue(arg, next);
        index += 1;
        break;
      case "--format":
        format = parseFormat(readValue(arg, next));
        index += 1;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--version":
      case "-V":
        process.stdout.write(`${version}\n`);
        process.exit(0);
        return {} as CliOptions; // unreachable, satisfies return type
      case "--help":
      case "-h":
        throw new UsageError(helpText());
      default:
        throw new UsageError(`Unknown argument: ${arg}\n\n${suggestFlag(arg)}\n${helpText()}`);
    }
  }

  if (Boolean(sourceFile) === Boolean(githubUrl)) {
    throw new UsageError(`Provide exactly one input source: --file or --github.\n\n${helpText()}`);
  }

  return {
    source: sourceFile ? { kind: "file", value: sourceFile } : { kind: "github", value: githubUrl as string },
    mode,
    dryRun,
    verbose,
    model,
    format
  };
}

function readValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new UsageError(`${flag} requires a value.`);
  }

  return value;
}

function parseMode(value: string): AssistantMode {
  if (value === "issue" || value === "pr" || value === "auto") {
    return value;
  }

  throw new UsageError("--mode must be issue, pr, or auto.");
}

function parseFormat(value: string): "json" | "markdown" {
  if (value === "json" || value === "markdown") {
    return value;
  }

  throw new UsageError("--format must be json or markdown.");
}

function suggestFlag(arg: string): string {
  const suggestions: Record<string, string> = {
    "--input": "Did you mean --file?",
    "--path": "Did you mean --file?",
    "--url": "Did you mean --github?",
    "--issue": "Did you mean --github?",
    "--json": "Did you mean --format json?",
    "--md": "Did you mean --format markdown?",
    "--quiet": "Did you mean --verbose?",
  };

  return suggestions[arg] ?? "";
}

function helpText(): string {
  return [
    "Usage:",
    "  oma --file ./issue.md --dry-run",
    "  oma --github https://github.com/owner/repo/issues/123 --format json",
    "",
    "Options:",
    "  --file <path>       Read issue or PR text from a local Markdown file.",
    "  --github <url>      Fetch a public GitHub issue or PR.",
    "  --mode <value>      auto, issue, or pr. Default: auto.",
    "  --model <model>     OpenAI model name. Default: gpt-4.1-mini.",
    "  --format <value>    markdown or json. Default: markdown.",
    "  --dry-run           Print the prompt without calling OpenAI.",
    "  --verbose, -v       Print debug information to stderr.",
    "  --version, -V       Print the version number.",
    "  --help, -h          Show this help message."
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
