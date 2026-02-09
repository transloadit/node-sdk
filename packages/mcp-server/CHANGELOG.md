# @transloadit/mcp-server

## 0.3.0

### Minor Changes

- d045c39: Add token-efficient robot documentation helpers:

  - `transloadit docs robots list|get` CLI commands for offline robot discovery and full docs.
  - `getRobotHelp()` supports `detailLevel: "full"` and exports `isKnownRobot()`.
  - MCP tool `transloadit_get_robot_help` returns full docs and supports requesting multiple robots.

### Patch Changes

- Updated dependencies [d045c39]
  - @transloadit/node@4.6.0

## 0.2.2

### Patch Changes

- 2631623: Allow overriding the Transloadit-Client header and set MCP server requests to its own client name.
- 2631623: Allow appending a client header suffix via TRANSLOADIT_CLIENT_SUFFIX.
- Updated dependencies [2631623]
  - @transloadit/node@4.5.1

## 0.2.1

### Patch Changes

- 56ada34: Document MCP client tool allowlists and keep verification tooling aligned.

## 0.2.0

### Minor Changes

- a5548db: Fetch builtin templates from the API and remove bundled builtin template data.

### Patch Changes

- a5548db: Add MCP client setup docs and a local verification script.
- Updated dependencies [a5548db]
  - @transloadit/node@4.5.0

## 0.1.0

### Minor Changes

- b7795dd: Add Prometheus-compatible metrics endpoint support.

## 0.0.3

### Patch Changes

- 51661f7: Add TRANSLOADIT_ENDPOINT support, make the CLI binary executable, and refresh MCP auth docs.

## 0.0.2

### Patch Changes

- 7128db8: Add a package README so npm shows MCP usage details.

## 0.0.1

### Patch Changes

- 065df19: Add sev-logger based logging with redaction for MCP server, and improve input handling with trusted assembly URLs and configurable URL download restrictions.
- Updated dependencies [065df19]
  - @transloadit/node@4.3.1
