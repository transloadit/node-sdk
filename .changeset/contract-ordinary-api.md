---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Add contract-generated ordinary HTTP methods through `client.contract()` and the `/contract`
entrypoint. Existing methods are unchanged. The new methods support signed requests or explicit
bearer authentication; they do not implement native TUS or Assembly lifecycle orchestration.

Generated public types retain source documentation. Optional-only params can be omitted, JSON
response objects fit the exported `JsonValue`, and `ContractResponseError.code` exposes recognized
public error codes without leaking response content into messages. Add a typed end-to-end example
and strict packed-package compilation, including the root entry point's Robot declarations.
