#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { UsageError } from "./errors.js";
import { formatResult } from "./format.js";
import { setLabels } from "./github.js";
import { loadTriageRequest } from "./input.js";
import { createOpenAIProvider } from "./openai-provider.js";
import { buildTriagePrompt } from "./prompt.js";
import { runTriage } from "./triage.js";
import type { AssistantMode, CliOptions, OutputFormat, ParseResult } from "./types.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

const DEFAULT_MODEL = "gpt-4.1-mini";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const result = parseArgs(argv);

  if (result.kind === "version") {
    process.stdout.write(`${version}\n`);
    return;
  }

  if (result.kind === "help") {
    process.stdout.write(`${result.text}\n`);
    return;
  }

  if (result.kind === "init") {
    await runInit();
    return;
  }

  if (result.kind === "batch") {
    const raw = await readFile(result.batchFile, "utf8");
    const sources = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    if (sources.length === 0) {
      throw new UsageError(`No sources found in ${result.batchFile}.`);
    }
    await runBatch(sources, result.options);
    return;
  }

  await runSingle(result.options);
}

async function runSingle(options: CliOptions): Promise<void> {
  const config = await loadConfig();

  if (config.githubToken) {
    process.env.GITHUB_TOKEN = config.githubToken;
  }

  applyConfigDefaults(options, config);

  const request = await loadTriageRequest(options);

  if (options.verbose) {
    process.stderr.write(`[verbose] mode=${request.mode} source=${request.sourceKind}:${request.sourceLabel}\n`);
    process.stderr.write(`[verbose] model=${options.model}\n`);
  }

  if (options.dryRun) {
    const customTemplate = config.prompts?.triage;
    process.stdout.write(`${buildTriagePrompt(request, customTemplate)}\n`);
    return;
  }

  const provider = createOpenAIProvider();
  const triageResult = await runTriage(request, options.model, provider, {
    systemPrompt: config.prompts?.system,
    triageTemplate: config.prompts?.triage,
  });
  process.stdout.write(formatResult(triageResult, options.format));

  if (options.writeLabels && request.githubRef) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      process.stderr.write("[warn] --write-labels requires GITHUB_TOKEN. Skipping label write-back.\n");
    } else {
      try {
        await setLabels(request.githubRef, triageResult.labels, token);
        process.stderr.write(`[info] Wrote ${triageResult.labels.length} labels to ${request.sourceLabel}\n`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[warn] Failed to write labels: ${message}\n`);
      }
    }
  }
}

async function runBatch(sources: string[], options: Omit<CliOptions, "source">): Promise<void> {
  const config = await loadConfig();

  if (config.githubToken) {
    process.env.GITHUB_TOKEN = config.githubToken;
  }

  const model = options.model === DEFAULT_MODEL && config.model ? config.model : options.model;
  const format = options.format === "markdown" && config.format ? config.format : options.format;
  const mode = options.mode === "auto" && config.mode ? config.mode : options.mode;

  if (options.dryRun) {
    for (const source of sources) {
      const inputSource = resolveSource(source);
      const triageOptions: CliOptions = { ...options, source: inputSource, model, format, mode };
      const request = await loadTriageRequest(triageOptions);
      const customTemplate = config.prompts?.triage;
      process.stdout.write(`--- ${source} ---\n`);
      process.stdout.write(`${buildTriagePrompt(request, customTemplate)}\n\n`);
    }
    return;
  }

  const provider = createOpenAIProvider();
  const results: Array<{ source: string; output: string }> = [];

  for (const source of sources) {
    const inputSource = resolveSource(source);
    const triageOptions: CliOptions = { ...options, source: inputSource, model, format, mode };
    const request = await loadTriageRequest(triageOptions);

    if (options.verbose) {
      process.stderr.write(`[verbose] processing ${source} (mode=${request.mode})\n`);
    }

    try {
      const triageResult = await runTriage(request, model, provider, {
        systemPrompt: config.prompts?.system,
        triageTemplate: config.prompts?.triage,
      });

      results.push({ source, output: formatResult(triageResult, format) });

      if (options.writeLabels && request.githubRef) {
        const token = process.env.GITHUB_TOKEN;
        if (token) {
          try {
            await setLabels(request.githubRef, triageResult.labels, token);
          } catch {
            // non-fatal for batch
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[error] ${source}: ${message}\n`);
    }
  }

  if (format === "json") {
    const combined = results.map((r) => ({ source: r.source, ...JSON.parse(r.output) }));
    process.stdout.write(`${JSON.stringify(combined, null, 2)}\n`);
  } else {
    for (const { source, output } of results) {
      process.stdout.write(`--- ${source} ---\n${output}\n`);
    }
  }
}

function resolveSource(value: string): { kind: "file"; value: string } | { kind: "github"; value: string } {
  if (value.includes("github.com/")) {
    return { kind: "github", value };
  }
  return { kind: "file", value };
}

async function runInit(): Promise<void> {
  const configPath = resolve(process.cwd(), ".oma.json");
  const template = {
    model: "gpt-4.1-mini",
    format: "markdown",
    mode: "auto",
    githubToken: "",
    prompts: {
      system: "",
      triage: "",
    },
  };

  try {
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(template, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`Created ${configPath}\n`);
    process.stdout.write("Edit the file to customize your defaults.\n");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST") {
      process.stdout.write(`${configPath} already exists. Skipping.\n`);
    } else {
      throw error;
    }
  }
}

function applyConfigDefaults(options: CliOptions, config: Awaited<ReturnType<typeof loadConfig>>): void {
  if (options.model === DEFAULT_MODEL && config.model) {
    options.model = config.model;
  }
  if (options.format === "markdown" && config.format) {
    options.format = config.format;
  }
  if (options.mode === "auto" && config.mode) {
    options.mode = config.mode;
  }
}

export function parseArgs(argv: string[]): ParseResult {
  let sourceFile: string | undefined;
  let githubUrl: string | undefined;
  let batchFile: string | undefined;
  let mode: AssistantMode = "auto";
  let dryRun = false;
  let verbose = false;
  let model = DEFAULT_MODEL;
  let format: OutputFormat = "markdown";
  let writeLabels = false;
  let init = false;

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
      case "--batch":
        batchFile = readValue(arg, next);
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
      case "--write-labels":
        writeLabels = true;
        break;
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--init":
        init = true;
        break;
      case "--version":
      case "-V":
        return { kind: "version" };
      case "--help":
      case "-h":
        return { kind: "help", text: helpText() };
      default:
        throw new UsageError(`Unknown argument: ${arg}\n\n${suggestFlag(arg)}\n${helpText()}`);
    }
  }

  if (init) {
    return { kind: "init" };
  }

  if (batchFile) {
    if (sourceFile || githubUrl) {
      throw new UsageError("--batch cannot be combined with --file or --github.");
    }
    return {
      kind: "batch",
      sources: [], // will be populated by reading the file in main()
      batchFile,
      options: { mode, dryRun, verbose, model, format, writeLabels },
    };
  }

  if (Boolean(sourceFile) === Boolean(githubUrl)) {
    throw new UsageError(`Provide exactly one input source: --file or --github.\n\n${helpText()}`);
  }

  return {
    kind: "options",
    options: {
      source: sourceFile ? { kind: "file", value: sourceFile } : { kind: "github", value: githubUrl as string },
      mode,
      dryRun,
      verbose,
      model,
      format,
      writeLabels,
    },
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

function parseFormat(value: string): OutputFormat {
  if (value === "json" || value === "markdown" || value === "slack" || value === "html" || value === "csv") {
    return value;
  }

  throw new UsageError("--format must be json, markdown, slack, html, or csv.");
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
    "--labels": "Did you mean --write-labels?",
    "--batch-file": "Did you mean --batch?",
  };

  return suggestions[arg] ?? "";
}

function helpText(): string {
  return [
    "Usage:",
    "  oma --file ./issue.md --dry-run",
    "  oma --github https://github.com/owner/repo/issues/123 --format json",
    "  oma --batch sources.txt --format slack",
    "  oma --init",
    "",
    "Options:",
    "  --file <path>       Read issue or PR text from a local Markdown file.",
    "  --github <url>      Fetch a public GitHub issue or PR.",
    "  --batch <file>      Process multiple sources from a file (one URL/path per line).",
    "  --mode <value>      auto, issue, or pr. Default: auto.",
    "  --model <model>     OpenAI model name. Default: gpt-4.1-mini.",
    "  --format <value>    markdown, json, slack, html, or csv. Default: markdown.",
    "  --dry-run           Print the prompt without calling OpenAI.",
    "  --write-labels      Apply triage labels to GitHub issues/PRs (requires GITHUB_TOKEN).",
    "  --init              Create a starter .oma.json config file.",
    "  --verbose, -v       Print debug information to stderr.",
    "  --version, -V       Print the version number.",
    "  --help, -h          Show this help message.",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
