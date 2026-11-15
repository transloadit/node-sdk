---
'@transloadit/node': patch
'transloadit': patch
'@transloadit/mcp-server': patch
---

Show textual API error reasons in CLI diagnostics, including wrapped Storage and authentication failures, while keeping structured reasons out of error lines and preserving the SDK's `ApiError.message`.
