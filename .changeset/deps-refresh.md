---
"@transloadit/mcp-server": patch
"@transloadit/node": patch
"transloadit": patch
---

Refresh repository dependencies for the Node SDK, the legacy `transloadit` wrapper, and the
validated MCP server release line.

This release folds in broad tooling and package updates, security and transitive lockfile refreshes,
and the test-only replacement of the obsolete `temp` helper with native Node temporary-file APIs.
`got` and `zod` remain on their current major versions because their latest releases require
follow-up migration work.
