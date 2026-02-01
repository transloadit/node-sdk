# Transloadit MCP Server — Design Spec

Design spec for a TypeScript MCP server module inside the Transloadit `node-sdk` monorepo. This doc
is intentionally implementation-oriented and skips marketing/launch items.

## 1. Product intent

Build a delightful, agent-native interface to Transloadit Assemblies. The MCP server should be thin
“glue” over existing SDKs and shared libraries, not a second implementation of core logic.

### Goals

- Let agents create, validate, and monitor Assemblies with minimal ceremony.
- Async-first: tool calls return fast and never require long blocking waits.
- Small, discoverable tool surface, with strong defaults.
- Works both hosted (Transloadit) and self-hosted (local CLI/HTTP).

### Non-goals (MVP)

- Legacy SSE transport.
- Streaming partial results over MCP transport.
- OAuth-based MCP auth flows (bearer tokens first).

## 2. Repo layout and responsibilities

### New package

- `packages/mcp-server` (ESM only, Node ≥ 22)
- Exports:
  - `createTransloaditMcpServer(options)`
  - `createTransloaditMcpHttpHandler(options)`
  - `createTransloaditMcpExpressRouter(options)`
  - CLI entrypoint `transloadit-mcp`

### Keep heavy lifting out of MCP

The MCP server should delegate as much work as possible to existing packages:

- `@transloadit/node` for API calls, tus uploads, polling, and future resume support.
- `@transloadit/zod/v3` for schemas and robot metadata.
- Shared alphalib for golden templates.

This means we should add missing functionality to `@transloadit/node` first (see todo list).

## 3. Transport

- **Streamable HTTP** at `/mcp` (primary).
- **stdio** transport (for Claude Desktop/Cursor local execution).
- **No legacy SSE** endpoints.

## 4. Auth model

### Hosted (`api2.transloadit.com/mcp`)

- Auth: `Authorization: Bearer <mcp_token>`
- Token minting endpoint: `POST https://api2.transloadit.com/token`
- Token format: opaque, 6-hour TTL.
- Scopes (MVP):
  - `assemblies:write`
  - `assemblies:read`
  - `assembly_notifications:write`
  - `template_credentials:read`
  - `queues:read`
  - `templates:read`

**API2 requirement:** API2 must accept MCP bearer tokens for Assembly-related endpoints, or expose
an equivalent verification endpoint that returns the auth context needed by the MCP server. The
preferred path is to accept MCP tokens directly as `Authorization: Bearer`.

### Self-hosted

- stdio and localhost HTTP: no MCP auth required by default.
- non-localhost HTTP: must be configured with a static bearer token, otherwise refuse to start.
- Transloadit API calls use `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET`.

## 5. CORS and network safety

- Hosted default: allow all origins. Config-driven allowlist supported.
- If allowlist is configured, disallowed origins return `403`.
- Requests without `Origin` are allowed (non-browser clients).
- Default bind is `127.0.0.1` for local HTTP servers.
- URL validation is handled by API2; MCP server does not enforce URL scheme checks.

## 6. Core data types

### InputFile

`InputFile` objects require a `field` name. The MCP server passes this field name to the SDK as the
upload field label. Agents must set `field` and should reference `:original` in instructions when
they want all uploads to be processed together.

```ts
export type InputFile =
  | {
      kind: 'path'
      field: string
      path: string
    }
  | {
      kind: 'base64'
      field: string
      base64: string
      filename: string
      contentType?: string
    }
  | {
      kind: 'url'
      field: string
      url: string
      filename?: string
      contentType?: string
    }
```

### Base64 and request limits

MCP gateways often cap request bodies to ~1 MB. To keep hosted DX predictable, we set explicit,
small limits and bias users toward URL or tus uploads.

- Hosted default request body limit: **1 MB** (JSON).
- Hosted default `maxBase64Bytes`: **512_000** (decoded bytes).
- Self-hosted default request body limit: **10 MB**, configurable.
- Reject oversize inputs with a structured error and a hint to use URL import or tus uploads.

## 7. Tool response envelope

All tools use a consistent response envelope.

```ts
export type ToolResponseBase = {
  status: 'ok' | 'error'
  errors?: Array<{
    code: string
    message: string
    hint?: string
    path?: string
  }>
  warnings?: Array<{
    code: string
    message: string
    hint?: string
    path?: string
  }>
  next_steps?: string[]
}
```

- `status` reflects the MCP tool call outcome.
- Assembly state lives under `assembly` to avoid collisions with `status`.
- `next_steps` is human-readable and intentionally short.

## 8. Tool surface

### 8.1 `transloadit_create_assembly`

Create or resume an Assembly, optionally uploading files.

**Input**

```ts
{
  instructions?: AssemblyInstructionsInput
  golden_template?: {
    slug: string
    version?: string
    overrides?: Record<string, unknown>
  }
  files?: InputFile[]
  fields?: Record<string, unknown>
  wait_for_completion?: boolean
  wait_timeout_ms?: number
  upload_concurrency?: number
  upload_chunk_size?: number
  assembly_url?: string
}
```

**Rules**

- `instructions` and `golden_template` are mutually exclusive.
- If `assembly_url` is provided, the tool attempts to **resume** uploads for that Assembly.
- Resume is driven by Assembly status (`tus_uploads` + `uploads`) and the provided files.
- This requires stable, **unique** `field` names and file metadata (`filename` + `size`) to match
  local files to remote uploads.
- URL files are imported via `/http/import` steps injected into the instructions (derived from
  `field` names if those steps are not already present).
- `wait_for_completion` is opt-in. Default is non-blocking.

**Resume mapping rules**

When `assembly_url` is provided, the server:

1. Fetches Assembly status.
2. Uses `assembly.tus_uploads` to find unfinished uploads (by `fieldname`, `filename`, `size`).
3. Uses `assembly.uploads` to skip already finished files.
4. **Only path-based inputs resume.** Non-file inputs (Buffer/string/stream) always start a new tus
   upload because they are not safely seekable.
5. For files without an existing `upload_url`, creates a new tus upload via `assembly.tus_url`.
6. Starts/resumes uploads with tus-js-client using the matched `upload_url`.

**Output**

```ts
{
  status: 'ok'
  assembly: AssemblyStatus
  upload: {
    status: 'none' | 'uploading' | 'complete'
    total_files: number
    resumed?: boolean
    upload_urls?: Record<string, string>
  }
  next_steps: string[]
}
```

### 8.2 `transloadit_get_assembly_status`

Poll Assembly status.

**Input**

```ts
{ assembly_url?: string; assembly_id?: string }
```

**Rules**

- If both are provided, `assembly_url` wins.

**Output**

```ts
{ status: 'ok'; assembly: AssemblyStatus }
```

### 8.3 `transloadit_wait_for_assembly`

Poll until completion or timeout.

**Input**

```ts
{
  assembly_url?: string
  assembly_id?: string
  timeout_ms?: number
  poll_interval_ms?: number
}
```

**Output**

```ts
{ status: 'ok'; assembly: AssemblyStatus; waited_ms: number }
```

### 8.4 `transloadit_validate_assembly`

Validate and lint AssemblyInstructions without creating an Assembly.

**Input**

```ts
{
  instructions: AssemblyInstructionsInput
  strict?: boolean
  return_fixed?: boolean
}
```

**Output**

```ts
{
  status: 'ok' | 'error'
  linting_issues: Array<{
    path: string
    message: string
    severity: 'error' | 'warning'
    hint?: string
  }>
  normalized_instructions?: AssemblyInstructionsInput
}
```

### 8.5 `transloadit_list_robots`

**Input**

```ts
{ category?: string; search?: string; limit?: number; cursor?: string }
```

**Output**

```ts
{
  status: 'ok'
  robots: Array<{
    name: string
    title?: string
    summary: string
    category?: string
  }>
  next_cursor?: string
}
```

### 8.6 `transloadit_get_robot_help`

**Input**

```ts
{ robot_name: string; detail_level?: 'summary' | 'params' | 'examples' }
```

**Output**

```ts
{
  status: 'ok'
  robot: {
    name: string
    summary: string
    required_params: Array<{ name: string; type: string; description?: string }>
    optional_params: Array<{ name: string; type: string; description?: string }>
    examples?: Array<{ description: string; snippet: Record<string, unknown> }>
  }
}
```

### 8.7 `transloadit_list_golden_templates`

**Output**

```ts
{
  status: 'ok'
  templates: Array<{
    slug: string
    version: string
    description: string
    steps: Record<string, unknown>
  }>
}
```

## 9. Golden templates (initial)

We start with exactly one template:

- **Slug:** `~transloadit/encode-hls-video@0.0.1`

```json
{
  "steps": {
    ":original": {
      "robot": "/upload/handle"
    },
    "low": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-270p",
      "result": true,
      "turbo": true
    },
    "mid": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-360p",
      "result": true,
      "turbo": true
    },
    "high": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-540p",
      "result": true,
      "turbo": true
    },
    "adaptive": {
      "robot": "/video/adaptive",
      "use": {
        "steps": ["low", "mid", "high"],
        "bundle_steps": true
      },
      "technique": "hls",
      "playlist_name": "my_playlist.m3u8"
    }
  }
}
```

Golden template definitions live in shared alphalib so that API2, Node SDK, and MCP server can use
the same source of truth.

## 10. CLI UX

- `transloadit-mcp stdio`
- `transloadit-mcp http --host 127.0.0.1 --port 5723 --config ./mcp.json`

Defaults:

- Host: `127.0.0.1`
- Port: `5723`
- Warn and require explicit `--host` when binding to non-localhost.

## 11. Implementation notes

- Use the official MCP TypeScript SDK (latest stable major at implementation time).
- Zod schemas live in `@transloadit/zod/v3` and are reused for tool schemas.
- Prefer named exports everywhere.
- Keep tool responses short; avoid dumping massive schemas into MCP responses.

## 12. Error codes (standardized)

- `BAD_REQUEST`
- `AUTH_REQUIRED`
- `AUTH_INVALID`
- `TRANSLOADIT_ERROR`
- `VALIDATION_ERROR`
- `BASE64_TOO_LARGE`
- `INTERNAL_ERROR`

These are the `code` values used inside `errors`/`warnings` arrays.
