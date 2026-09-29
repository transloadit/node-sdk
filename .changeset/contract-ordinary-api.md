---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Add contract-generated ordinary HTTP methods through `client.contract()` and the `/contract`
entrypoint. The new methods support signed requests or explicit
bearer authentication. Add explicit `waitForAssembly` and `cancelAndWaitForAssembly` workflows over
these methods, with source-owned uploader admission, overall deadlines and terminal-status checks.
Cancellation is one attempt on the owning uploader, never an automatically retried write.
Add fixed-size `uploadAssemblyFile` and `resumeAssemblyFile` workflows through contract-owned tus
bindings. Persist a private upload session before bytes are sent; a fresh client checks the file
digest and server offset before resuming. Recover ambiguous PATCH responses without duplicating
accepted bytes. Creation never retries. Deferred lengths and concatenation remain outside this
experimental namespace.
Workflow status reads retry transient network failures and HTTP 429/5xx within the overall deadline,
honoring `Retry-After`. An aborted connection is not proof of completion: waiting raises
`AssemblyWorkflowUnconfirmedError`; cancellation is still attempted once before reporting unconfirmed cleanup.
An HTTP error from cancellation is confirmed with a status GET before claiming terminal cleanup.
Explicitly configured proxy prefixes and loopback endpoints remain supported.

Generated public types retain source documentation. Optional-only params can be omitted, JSON
response objects fit the exported `JsonValue`, and `ContractResponseError.code` exposes recognized
public error codes without leaking response content into messages. Add a typed end-to-end example
and strict packed-package compilation, including the root entry point's Robot declarations.

Add shared executable workflow fixtures for contract-client upload/resume/wait/cancel and local
Smart CDN signing. Keep ordinary regression coverage for the existing public SDK. Fix its polling deadline to
abort in-flight status requests and rate-limit retry waits, and reject late success responses as
`POLLING_TIMED_OUT`, instead of waiting past the caller's budget. This also applies when
`createAssembly` or `resumeAssemblyUploads` shares its remaining timeout with completion polling.
The `contract()` adapter rounds
positive fractional millisecond timeouts up to the next integer rather than rejecting them.
It rejects an inherited zero request timeout rather than silently changing it to an unbounded
request. In-flight legacy polling aborts retain got's `AbortError` classification; the polling
deadline still uses `PollingTimeoutError`.
