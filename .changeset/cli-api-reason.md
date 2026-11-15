---
'@transloadit/node': patch
'transloadit': patch
'@transloadit/mcp-server': patch
---

Show textual API error reasons in CLI diagnostics, including wrapped Storage and authentication failures. Keep structured reasons out of error lines, sanitize terminal controls, and bound error text while preserving the SDK's `ApiError.message`.
