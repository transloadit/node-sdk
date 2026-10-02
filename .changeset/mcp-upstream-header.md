---
"@transloadit/node": minor
"transloadit": minor
---

Add an `extraHeaders` client option so trusted relays such as the hosted MCP service can send a
fixed header (`Transloadit-Mcp-Upstream`) with every API request next to a forwarded bearer token.
Like `Authorization`, these headers are dropped when a redirect leaves the API origin.

`listTemplates()` also accepts `fields`, for API2 columns such as `account_id` that the default
Template list omits.
