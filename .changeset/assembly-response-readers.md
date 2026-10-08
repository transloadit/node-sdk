---
'@transloadit/node': major
'transloadit': major
'@transloadit/types': major
'@transloadit/zod': major
'@transloadit/mcp-server': minor
'@transloadit/notify-url-relay': minor
---

Correct Assembly response readers to preserve numeric State/XPSubject metadata, repeated date tags and null uploaded-file extensions already emitted by the API. Read nonempty future Assembly error codes without confusing the closed known-code inventory with the public response contract; terminal-error helpers now recognize those responses.

These corrections widen exported response types. Consumers must handle numeric metadata, arrays of date values, nullable uploaded-file extensions and unknown error strings. The MCP server and notification relay follow the corrected response types in pre-1.0 minor releases; the relay publicly exports its AssemblyResponse alias. See the [Assembly response migration guide](https://github.com/transloadit/node-sdk/blob/main/docs/monorepo-architecture.md#assembly-response-migration) for the affected fields and narrowing rules.
