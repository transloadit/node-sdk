---
'@transloadit/mcp-server': patch
---

Keep the MCP server instructions short and neutral so they no longer script a chain of tool calls, which OpenAI's app review flags. The Robot listing, Robot help and lint results now carry `next_steps` pointing to the usual follow-up tool instead, and a wait that returns `running: true` lists the tools that keep following the Assembly.
