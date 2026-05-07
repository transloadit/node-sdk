---
"@transloadit/node": patch
"@transloadit/mcp-server": patch
"transloadit": patch
---

Release the Node SDK, the legacy `transloadit` wrapper, and the validated MCP server together after
the latest security-maintenance batch.

This release includes lockfile updates for the `ip-address`, `minimatch`, and `brace-expansion`
advisories, and the CI coverage-publishing guard that lets Dependabot E2E checks pass when the
private coverage repository key is unavailable.
