---
'@transloadit/mcp-server': patch
---

Return friendly 200 JSON for bare GET health probes instead of 406

Directory crawlers (Glama, uptime monitors) probe MCP endpoints with a plain GET without the required `Accept: text/event-stream` header. Previously this reached the MCP SDK transport which returned an opaque 406 "Not Acceptable". Now the HTTP handler intercepts these non-MCP GETs and returns a `{"name":"Transloadit MCP Server","status":"ok","docs":"..."}` response. Real MCP clients always include the SSE Accept header and are unaffected.
