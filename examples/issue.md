# CLI crashes on empty input

When I run:

```sh
oma --file empty.md
```

The command exits with a stack trace instead of a clear message.

Expected behavior: show a concise usage error and exit with a non-zero code.
