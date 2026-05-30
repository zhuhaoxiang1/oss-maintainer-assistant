# oss-maintainer-assistant

[![CI](https://github.com/zhuhaoxiang1/oss-maintainer-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/zhuhaoxiang1/oss-maintainer-assistant/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/oss-maintainer-assistant)](https://www.npmjs.com/package/oss-maintainer-assistant)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![typescript](https://img.shields.io/badge/typescript-5.8-blue)](https://www.typescriptlang.org)

A dry-run-first CLI that helps open-source maintainers triage issues and pull requests. It reads a GitHub issue/PR or a local Markdown file, builds a structured prompt, and optionally calls OpenAI to produce a summary, label suggestions, priority, a draft reply, and a changelog note.

The tool is intentionally conservative: it never writes comments, labels, or changes back to GitHub. Maintainers stay in control.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [CLI Reference](#cli-reference)
- [Output Format](#output-format)
- [Programmatic Usage](#programmatic-usage)
- [Architecture](#architecture)
- [Security](#security)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Quick Start

```sh
# Clone and install
git clone https://github.com/zhuhaoxiang1/oss-maintainer-assistant.git
cd oss-maintainer-assistant
npm install

# Preview the prompt (no API key needed)
npm start -- --file examples/issue.md --dry-run

# Analyze a GitHub issue (requires OpenAI API key)
export OPENAI_API_KEY=sk-...
npm start -- --github https://github.com/owner/repo/issues/123
```

## Installation

**Global install** (recommended for CLI use):

```sh
npm install -g oss-maintainer-assistant
oma --help
```

**One-shot** with npx:

```sh
npx oss-maintainer-assistant --file issue.md --dry-run
```

**As a library:**

```sh
npm install oss-maintainer-assistant
```

## CLI Reference

```
oma [options]

Options:
  --file <path>       Read issue or PR text from a local Markdown file.
  --github <url>      Fetch a public GitHub issue or PR.
  --mode <value>      auto, issue, or pr. Default: auto.
  --model <model>     OpenAI model name. Default: gpt-4.1-mini.
  --format <value>    markdown or json. Default: markdown.
  --dry-run           Print the prompt without calling OpenAI.
  --verbose, -v       Print debug information to stderr.
  --version, -V       Print the version number.
  --help, -h          Show this help message.
```

### Examples

```sh
# Preview what would be sent to the AI
oma --file examples/issue.md --dry-run

# Analyze a public PR
oma --github https://github.com/openai/openai-node/pull/99 --format json

# Use a different model
oma --file examples/pr.md --model gpt-4.1 --mode pr

# Verbose mode for debugging
oma --file examples/issue.md --dry-run --verbose
```

## Output Format

The assistant returns a structured result with five fields:

| Field             | Description                                        |
| ----------------- | -------------------------------------------------- |
| `summary`         | One or two concise sentences summarizing the item. |
| `labels`          | Suggested labels such as `type:bug`, `area:cli`.   |
| `priority`        | `low`, `medium`, or `high`.                        |
| `maintainerReply` | A respectful draft reply for the author.           |
| `changelogNote`   | A short release note when relevant.                |

### Markdown output (default)

```
## Summary
The CLI crashes when given an empty input file.

## Labels
- type:bug
- area:cli

## Priority
high

## Maintainer Reply
Thanks for the report! Could you share the command you ran and the full error output?

## Changelog Note
Fix crash when processing empty input files.
```

### JSON output (`--format json`)

```json
{
  "summary": "The CLI crashes when given an empty input file.",
  "labels": ["type:bug", "area:cli"],
  "priority": "high",
  "maintainerReply": "Thanks for the report! Could you share the command you ran and the full error output?",
  "changelogNote": "Fix crash when processing empty input files."
}
```

## Programmatic Usage

The package exports all core functions for use as a library:

```typescript
import {
  buildTriagePrompt,
  runTriage,
  formatResult,
  parseGitHubUrl,
  fetchGitHubMarkdown,
  type TriageRequest,
  type TriageResult,
} from "oss-maintainer-assistant";

// Build a triage request
const request: TriageRequest = {
  sourceLabel: "my-issue.md",
  mode: "issue",
  body: "## Bug\nThe app crashes on startup.",
};

// Preview the prompt
const prompt = buildTriagePrompt(request);
console.log(prompt);

// Run triage (requires OPENAI_API_KEY)
const result = await runTriage(request, "gpt-4.1-mini");
console.log(formatResult(result, "json"));
```

## Architecture

```
src/
  cli.ts        CLI entry point and argument parsing
  types.ts      Core type definitions
  errors.ts     Custom UsageError class
  input.ts      Load triage request from file or GitHub
  github.ts     GitHub URL parsing and API fetching
  prompt.ts     Build structured triage prompts
  triage.ts     OpenAI integration and response validation
  format.ts     Output formatting (JSON and Markdown)
  index.ts      Programmatic API barrel export
```

**Data flow:** CLI parses args -> Input loads body from file/GitHub -> Prompt builds structured prompt -> (dry-run: print and exit) -> Triage calls OpenAI with JSON response format -> Format renders output.

## Security

- API keys are read only from `OPENAI_API_KEY` environment variable.
- The CLI does not store or log secrets.
- The CLI does not mutate GitHub issues, pull requests, labels, comments, or releases.
- Use `--dry-run` to inspect the exact prompt before any model call.

See [SECURITY.md](SECURITY.md) for the full security policy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE)
