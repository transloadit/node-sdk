---
'@transloadit/mcp-server': patch
---

Fix "Server already initialized" error when multiple MCP clients connect concurrently. The HTTP and Express handlers now create a new transport + server pair per session instead of sharing a single transport instance.
