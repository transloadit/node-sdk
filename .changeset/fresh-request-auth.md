---
"@transloadit/mcp-server": patch
"@transloadit/node": patch
"transloadit": patch
---

Keep caller-owned request parameters unchanged when signing requests. Reusing the same params or auth object now generates a fresh default expiration for each request instead of retaining the first request’s expiration. Explicit Auth Keys and expiration timestamps are still respected.
