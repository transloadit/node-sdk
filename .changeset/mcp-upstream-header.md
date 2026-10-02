---
"@transloadit/node": minor
"transloadit": minor
---

Add an `extraHeaders` client option so trusted relays such as the hosted MCP service can send a
fixed header (`Transloadit-Mcp-Upstream`) with every API request next to a forwarded bearer token.
