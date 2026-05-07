# @transloadit/mcp-server

## 0.3.20

### Patch Changes

- e832510: Refresh Node SDK and CLI dependencies, removing unused AWS SDK packages from the published dependency tree while keeping existing API behavior unchanged.
- Updated dependencies [e832510]
  - @transloadit/node@4.10.1

## 0.3.19

### Patch Changes

- 153674b: Add an `image upscale` intent command that wires up the `/image/upscale` Robot for AI image
  upscaling. Flags `--model` (`nightmareai/real-esrgan` by default, plus `tencentarc/gfpgan` and
  `sczhou/codeformer`), `--scale` (2 or 4), and `--face-enhance` are derived from the robot schema.
- Updated dependencies [153674b]
  - @transloadit/node@4.10.0

## 0.3.18

### Patch Changes

- 06fb294: Document and test `gpt-image-2` support in the image generation intent flow.
- Updated dependencies [06fb294]
  - @transloadit/node@4.9.1

## 0.3.17

### Patch Changes

- a6b4233: Add an `image merge` intent command that wires up the `/image/merge` Robot's new `polaroid-stack`
  and `mosaic` collage effects alongside the classic spritesheet modes. Also syncs the updated
  `/image/merge` schema from alphalib.
- Updated dependencies [a6b4233]
  - @transloadit/node@4.9.0

## 0.3.16

### Patch Changes

- f79d2d0: Improve `assemblies create` timeout diagnostics by including the assembly URL when available and
  stabilize the CLI watch-mode test coverage around concurrent assembly updates.
- Updated dependencies [f79d2d0]
  - @transloadit/node@4.8.3

## 0.3.15

### Patch Changes

- 4a63ff7: Improve intent output defaults by inferring local output paths when `--output` is omitted and standardizing intent docs on `--output, -o`.
- Updated dependencies [4a63ff7]
  - @transloadit/node@4.8.2

## 0.3.14

### Patch Changes

- cd662b0: Serve Streamable HTTP MCP requests statelessly so hosted deployments keep working behind non-sticky load balancing while preserving isolated transport instances per request.

## 0.3.13

### Patch Changes

- 28f1a43: Add home-credentials CLI support and release the MCP server alongside the updated Node package.
- Updated dependencies [28f1a43]
  - @transloadit/node@4.8.1

## 0.3.12

### Patch Changes

- aa91113: Add input-guided `image generate` intent support, default image generation to
  `google/nano-banana-2`, and document multi-image prompting by filename.
- Updated dependencies [aa91113]
  - @transloadit/node@4.8.0

## 0.3.11

### Patch Changes

- b716069: Release the alphalib sync from #370 through npm.

  This updates the Node SDK's generated alphalib robot and template types to match the latest sync,
  including new robot schemas and metadata refinements. Release the MCP server alongside it so the
  validated server and SDK surfaces stay aligned.

- Updated dependencies [b716069]
  - @transloadit/node@4.7.7

## 0.3.10

### Patch Changes

- 0702871: Fix "Server already initialized" error when multiple MCP clients connect concurrently. The HTTP and Express handlers now create a new transport + server pair per session instead of sharing a single transport instance.

## 0.3.9

### Patch Changes

- 377bf31: Raise default listRobots limit from 20 to 200 so agents see all robots in one call
- Updated dependencies [377bf31]
  - @transloadit/node@4.7.5

## 0.3.8

### Patch Changes

- 997b917: Add Dockerfile and GHCR publishing workflow

## 0.3.7

### Patch Changes

- 5a07c08: Return friendly 200 JSON for bare GET health probes instead of 406

  Directory crawlers (Glama, uptime monitors) probe MCP endpoints with a plain GET without the required `Accept: text/event-stream` header. Previously this reached the MCP SDK transport which returned an opaque 406 "Not Acceptable". Now the HTTP handler intercepts these non-MCP GETs and returns a `{"name":"Transloadit MCP Server","status":"ok","docs":"..."}` response. Real MCP clients always include the SSE Accept header and are unaffected.

## 0.3.6

### Patch Changes

- Add mcpName field and server.json manifest for Official MCP Registry publishing

## 0.3.5

### Patch Changes

- ddf13ec: Export `./server-card` subpath so consumers can cleanly import `buildServerCard`

## 0.3.4

### Patch Changes

- e11f29f: Fix MCP server card schema and add coverage for `/.well-known/mcp/server-card.json`.

## 0.3.3

### Patch Changes

- 753f76d: Release @transloadit/mcp-server in lockstep when @transloadit/node is updated.
- Updated dependencies [753f76d]
  - @transloadit/node@4.7.4

## 0.3.2

### Patch Changes

- 7b41cb1: Add npm keywords for discoverability.

## 0.3.1

### Patch Changes

- ee1edb7: Improve builtin template discoverability by adding actionable hints to MCP errors and warnings.
- Updated dependencies [ee1edb7]
  - @transloadit/node@4.7.1

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
