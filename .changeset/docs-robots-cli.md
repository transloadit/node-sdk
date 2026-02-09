---
"@transloadit/node": minor
"@transloadit/mcp-server": minor
---

Add token-efficient robot documentation helpers:

- `transloadit docs robots list|get` CLI commands for offline robot discovery and full docs.
- `getRobotHelp()` supports `detailLevel: "full"` and exports `isKnownRobot()`.
- MCP tool `transloadit_get_robot_help` returns full docs and supports requesting multiple robots.

