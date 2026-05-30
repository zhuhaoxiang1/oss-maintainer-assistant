# Release Checklist

Use this checklist before tagging a release.

- Run `npm test`.
- Run `npm start -- --file examples/issue.md --dry-run`.
- Update `README.md` if CLI flags or output changed.
- Confirm no secrets, `.env` files, or tokens are staged.
- Create a GitHub release with user-facing changes and known limitations.
