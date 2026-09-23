---
"@transloadit/mcp-server": patch
"@transloadit/node": patch
"transloadit": patch
---

Restrict MCP file inputs to base64 and URLs, and require public HTTP(S) targets for server-side
downloads. Local filesystem path inputs are no longer supported in hosted or self-hosted MCP;
upload local files with `npx -y @transloadit/node upload` instead.

Validate Assembly references and resolve them through the configured API endpoint so MCP callers
cannot redirect authenticated status, wait, or resume requests to arbitrary hosts. Resume uploads
from public URL inputs without requiring the original Assembly Instructions.

Add the SDK's `followRedirects` option (defaulting to `true`) and disable API redirects in MCP,
including responses for Assemblies configured with `redirect_url`.
