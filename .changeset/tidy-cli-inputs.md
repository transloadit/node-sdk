---
"@transloadit/mcp-server": patch
"@transloadit/node": patch
"@transloadit/utils": patch
"transloadit": patch
---

Accept both steps-only JSON and a wrapper containing only `steps` in `assemblies create --steps`. Reject other wrapper properties instead of silently discarding them. Preserve the final newline in files rewritten by `assemblies lint --fix` without adding blank lines on repeated fixes, and document the `run` and `assembly-instructions compile` commands.

Limit API signatures to the supported SHA-1, SHA-256, and SHA-384 algorithms in the CLI and shared utilities. Unsupported algorithms such as SHA-512 now fail locally in `signParams`, `signParamsSync`, and SDK signature generation, and are rejected by `verifyWebhookSignature`; SHA-512 remains available for file hashes. Release the MCP server and `transloadit` CLI alongside the Node SDK.
