---
'@transloadit/mcp-server': patch
---

Tool descriptions no longer refer to other tools, as Claude's connector directory requires. Each
tool describes only its own inputs and outputs, and the workflow across tools moved to the server
instructions sent on initialize.
