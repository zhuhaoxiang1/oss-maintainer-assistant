# Support custom label mappings via configuration file

## Problem

Currently the tool suggests labels based on the AI's interpretation, but every project has its own labeling convention. There's no way to tell the tool "when you detect a bug, suggest `type:bug` instead of `bug`".

## Proposed Behavior

Add support for a `.oma.json` configuration file in the project root that allows custom label mappings:

```json
{
  "labelMappings": {
    "bug": "type:bug",
    "feature": "type:enhancement",
    "documentation": "type:docs",
    "question": "type:question"
  }
}
```

The tool would read this file automatically and remap suggested labels before outputting the result.

## Alternatives Considered

1. **CLI flag `--label-map <file>`**: More explicit but harder to use repeatedly.
2. **Environment variable `OMA_LABEL_MAP`**: Works but less discoverable.
3. **Inline in the prompt**: Could add label conventions to the system prompt, but this is fragile.
