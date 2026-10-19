---
'@transloadit/mcp-server': patch
---

The Assembly result widget now follows a running Assembly until it finishes, then shows its result files in place. It checks `transloadit_get_assembly_status` through the host's tool bridge (MCP Apps `tools/call` or ChatGPT's `callTool`), backing off from 2 to 10 seconds for up to 15 minutes, pausing while hidden, and offers "Check again" when automatic checks stop. Previously a widget rendered for a running Assembly showed "Processing" until the model happened to call `transloadit_wait_for_assembly`.
