---
'@transloadit/node': patch
'transloadit': patch
'@transloadit/mcp-server': patch
'@transloadit/types': patch
'@transloadit/zod': patch
---

Release the latest alphalib robot schema sync.

This updates generated Robot and assembly-status schemas, the public TypeScript type package, and
the Zod schema package so SDK, CLI, MCP, and schema consumers all see the same validated Transloadit
API surface.
