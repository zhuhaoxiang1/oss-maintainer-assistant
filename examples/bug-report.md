# CLI crashes with "Cannot read properties of undefined" when GitHub API returns 403

## Description

When fetching a GitHub issue that the authenticated user doesn't have access to, the CLI throws an unhandled `TypeError` instead of showing a clear error message.

## Steps to Reproduce

```sh
oma --github https://github.com/private-org/private-repo/issues/1
```

## Expected Behavior

A clear error message like: "GitHub API returned 403. Check that the repository is public or that you have access."

## Actual Behavior

```
TypeError: Cannot read properties of undefined (reading 'title')
    at fetchGitHubMarkdown (file:///.../src/github.ts:45:23)
```

## Environment

- Node.js: v22.1.0
- OS: macOS 14.5
- Package version: 0.1.0
