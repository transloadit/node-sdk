---
'@transloadit/mcp-server': patch
---

Return the Assembly ID promptly from `transloadit_create_assembly`, the Builtin shortcuts and `transloadit_wait_for_assembly`. Waiting now stops after a 45 second budget (configurable with `maxWaitMs` or `TRANSLOADIT_MCP_MAX_WAIT_MS`), below the point where MCP hosts abandon and retry a tool call, and a polling timeout returns the known Assembly instead of an error. Such results carry `running: true` and an `mcp_assembly_still_running` notice that says to follow the Assembly instead of creating it again. A slow URL download no longer delays creation: the Assembly is created first and receives the file when the download finishes, or is cancelled when it fails.
