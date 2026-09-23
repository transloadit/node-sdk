---
"@transloadit/mcp-server": patch
---

Restrict MCP file inputs to base64 and URLs, and require public HTTP(S) targets for server-side
downloads. Local filesystem path inputs are no longer supported in hosted or self-hosted MCP;
upload local files with `npx -y @transloadit/node upload` instead.
