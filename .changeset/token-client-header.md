---
'@transloadit/mcp-server': patch
'@transloadit/node': patch
'transloadit': patch
---

Include the SDK name and version in the Transloadit-Client header on bearer token requests from the
SDK and CLI. Preserve the configured SDK client name when minting tokens.
