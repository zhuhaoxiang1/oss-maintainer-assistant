# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-05-31

### Added

- CLI with `--file`, `--github`, `--mode`, `--model`, `--format`, `--dry-run` flags.
- OpenAI-powered triage: summary, labels, priority, maintainer reply, changelog note.
- JSON and Markdown output formats.
- `--dry-run` mode to preview the exact prompt before any model call.
- GitHub issue and PR fetching via public API.
- `--version` / `-V` flag to print the package version.
- `--verbose` / `-v` flag to print debug information to stderr.
- Programmatic API via `import { runTriage, buildTriagePrompt, ... } from "oss-maintainer-assistant"`.
- Common misspelling detection for CLI flags with helpful suggestions.
- Unit tests for all modules (CLI, GitHub, prompt, format, input, errors, triage).
- Integration test for dry-run mode.
- CI with lint, typecheck, format-check, and test matrix (Node 20 + 22).
- ESLint 9 and Prettier for code quality.
- Dependabot for automated dependency updates.
- Issue templates for bug reports and feature requests.
- Pull request template.
- Example files for issues, PRs, bug reports, and feature requests.
