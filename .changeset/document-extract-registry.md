---
"@transloadit/node": patch
"transloadit": patch
"@transloadit/mcp-server": patch
"@transloadit/types": patch
"@transloadit/zod": major
---

Refresh Robot schemas from API2 and register `/document/extract` so Assembly Instructions lint clean through the SDK and MCP server. Regenerate the SDK Robot registry during builds to keep new schemas registered, and align the Tigris metadata keys with API2.

In `@transloadit/zod`, replace `robotsMeta.tigrisImport` and `robotsMeta.tigrisStore` with `robotsMeta.tigrisImportMeta` and `robotsMeta.tigrisStoreMeta`. This metadata API change requires a major release of that package; the other packages receive patch updates.
