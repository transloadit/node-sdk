---
"@transloadit/node": patch
"@transloadit/mcp-server": patch
"transloadit": patch
---

Create missing CLI output directories recursively when `-o` ends in `/` or `\`, so Templates with multiple results work on the first run. Preserve single-file outputs without a trailing separator and suggest `-o <dir>/` when multiple results need a directory.
