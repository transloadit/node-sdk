---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Add contract-generated ordinary HTTP methods through `client.contract()` and the `/contract`
entrypoint. Existing methods are unchanged. The new methods support signed requests or explicit
bearer authentication; they do not implement native TUS or Assembly lifecycle orchestration.
