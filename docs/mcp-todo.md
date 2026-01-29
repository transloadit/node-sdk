# MCP Server — Todo List

This list is ordered. The top section is intentionally focused on other packages first so that
`@transloadit/mcp-server` can stay thin glue.

## 1. Prereqs in existing packages (do first)

### 1.1 `@transloadit/node`

- ✅ Add assembly linting support:
  - New `lintAssemblyInstructions()` that returns `linting_issues` using the existing
    `assemblyLinter` schema (or create a new one if missing).
  - Export the linting issue schema for MCP usage.
- ✅ Add upload resume support:
  - Expose `resumeUploads()` that uses Assembly status (`tus_uploads` + `uploads`) to find
    unfinished uploads.
  - Resume only for path-based inputs; non-file inputs always start a new tus upload.
  - Ensure `createAssembly()` can return `upload_urls` for best UX (optional, not required
    for resume).
- Allow non-blocking uploads:
  - Add `uploadBehavior` option to `createAssembly()`:
    - `await` (current behavior)
    - `background` (return immediately after starting uploads)
    - `none` (return assembly + upload URLs without starting uploads)
  - Return `upload_urls` for each file field when `background`/`none` is selected.
- Add a small helper that converts `InputFile[]` to:
  - `uploads` streams (base64)
  - `files` paths
  - `/http/import` step injections (URL files)
- Export robot catalog helpers:
  - `listRobots()`
  - `getRobotHelp()`

### 1.2 Shared alphalib

- Add golden template definitions under alphalib:
  - `~transloadit/encode-hls-video@0.0.1`
  - Export as a plain object map for SDK + MCP server.

### 1.3 `@transloadit/zod/v3`

- Export a minimal robot metadata registry (name, summary, category, param schema).
- Ensure `AssemblyStatus` schema and `AssemblyInstructionsInput` are publicly exported.

## 2. API2 groundwork

- Implement `POST /tokens/mcp`:
  - Accept key/secret auth.
  - Return opaque bearer token (TTL 6 hours) with scopes.
- Accept MCP bearer tokens for Assembly endpoints used by the MCP server
  (create assembly, get assembly status, replay notification, etc.).
- Scope enforcement and audit logging for MCP tokens.

## 3. `@transloadit/mcp-server` package

### 3.1 Package scaffold

- Add `packages/mcp-server` with ESM-only build, Node ≥ 22.
- Provide exports:
  - `createTransloaditMcpServer()`
  - `createTransloaditMcpHttpHandler()`
  - `createTransloaditMcpExpressRouter()`
- Add CLI entrypoint `transloadit-mcp`.

### 3.2 Transports

- Streamable HTTP handler at `/mcp`.
- stdio transport for local execution.
- No SSE.

### 3.3 Tool implementations

- `transloadit_create_assembly`:
  - New Assembly creation and resume logic.
  - Optional background uploads via `@transloadit/node`.
  - URL imports via injected `/http/import` steps.
- `transloadit_get_assembly_status`
- `transloadit_wait_for_assembly`
- `transloadit_validate_assembly`
- `transloadit_list_robots`
- `transloadit_get_robot_help`
- `transloadit_list_golden_templates`

### 3.4 Auth & security

- Hosted bearer token validation (pass-through to API2).
- Self-hosted auth:
  - No auth on localhost.
  - Required static bearer token on non-localhost.
- Configurable CORS allowlist with 403 on disallowed origins.

### 3.5 Config surface

- Env support: `TRANSLOADIT_KEY`, `TRANSLOADIT_SECRET`, `TRANSLOADIT_MCP_TOKEN`.
- CLI flags: `--host`, `--port`, `--config`.
- Defaults: host `127.0.0.1`, port `5723`.

## 4. Tests

### 4.1 Unit tests

- Linting output formatting and error mapping.
- URL import injection logic.
- Base64 size limit enforcement.
- Robot catalog and help utilities.

### 4.2 E2E tests

- Full flow: create → upload → wait → results.
- Resume flow: interrupt upload, resume using Assembly status and the same input files.
- Gate live tests behind env vars (e.g., `TRANSLOADIT_E2E=1`).

## 5. Docs

- `docs/mcp-spec.md` (this design doc).
- `docs/mcp-todo.md` (this task list).
- README snippet for local usage (CLI + Claude Desktop example).
