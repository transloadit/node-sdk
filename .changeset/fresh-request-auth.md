---
"@transloadit/mcp-server": patch
"@transloadit/node": patch
"transloadit": patch
---

Keep caller-owned request parameters unchanged when signing requests. Reusing the same params or auth object now generates a fresh default expiration for each request instead of retaining the first request’s expiration. Explicit Auth Keys and expiration timestamps are still respected.

When using `calcSignature`, read the generated auth values from its returned `params` JSON string rather than from the input object. Send that returned string together with its signature.
