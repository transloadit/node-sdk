---
"@transloadit/node": patch
"transloadit": patch
"@transloadit/mcp-server": patch
---

Clarify the upload-once example’s device approval and local catalog guidance, report uploaded versus reused originals through an additive CLI JSON `uploaded` boolean, and use sample-sized variants with a visible crop. Detect rejected Smart CDN delivery before reporting success and show safe recovery guidance for failed images. Release the legacy CLI and MCP server alongside the SDK.
