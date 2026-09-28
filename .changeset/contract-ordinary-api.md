---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Add contract-generated ordinary HTTP methods through `client.contract()` and the `/contract`
entrypoint. The new methods support signed requests or explicit
bearer authentication; they do not implement native TUS or Assembly lifecycle orchestration.

Generated public types retain source documentation. Optional-only params can be omitted, JSON
response objects fit the exported `JsonValue`, and `ContractResponseError.code` exposes recognized
public error codes without leaking response content into messages. Add a typed end-to-end example
and strict packed-package compilation, including the root entry point's Robot declarations.

Add shared executable workflow fixtures for the existing public SDK. Fix its polling deadline to
abort in-flight status requests and rate-limit retry waits, and reject late success responses as
`POLLING_TIMED_OUT`, instead of waiting past the caller's budget. This also applies when
`createAssembly` or `resumeAssemblyUploads` shares its remaining timeout with completion polling.
The generated low-level client does not implement these workflows. The `contract()` adapter rounds
positive fractional millisecond timeouts up to the next integer rather than rejecting them.
