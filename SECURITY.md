# Security Policy

## Supported Versions

The project is pre-1.0. Security fixes target the latest released version.

## Reporting a Vulnerability

Please open a private security advisory on GitHub if available. If not, open an issue with a minimal description and avoid posting secrets, tokens, private logs, or exploit details publicly.

## Secret Handling

`oss-maintainer-assistant` reads `OPENAI_API_KEY` from the environment. It does not require keys in config files and should not log secret values.
