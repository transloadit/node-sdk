# @transloadit/mcp-server

Transloadit MCP server (Streamable HTTP + stdio). This package is thin glue over
`@transloadit/node` and shared libraries.

## Install

```bash
npm install @transloadit/mcp-server
```

## Quick start (HTTP)

```bash
transloadit-mcp http --host 127.0.0.1 --port 5723
```

## Quick start (stdio)

```bash
transloadit-mcp stdio
```

## Auth model

**Hosted (api2.transloadit.com/mcp)**

- Mint a token via `POST https://api2.transloadit.com/token` (HTTP Basic Auth with key+secret).
- Use `Authorization: Bearer <access_token>` on API2 requests.
- Bearer tokens **satisfy signature auth**; signature checks apply only to key/secret requests.

**Self-hosted**

- stdio and localhost HTTP require no MCP auth by default.
- Non-localhost HTTP requires `TRANSLOADIT_MCP_TOKEN`.
- API calls use `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET`, or bearer tokens if provided.

## Configuration

Environment:

- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`
- `TRANSLOADIT_MCP_TOKEN`
- `TRANSLOADIT_ENDPOINT` (optional, default `https://api2.transloadit.com`)
- `TRANSLOADIT_MCP_METRICS_PATH` (optional, default `/metrics`)

CLI:

- `transloadit-mcp http --host 127.0.0.1 --port 5723 --endpoint https://api2.transloadit.com`
- `transloadit-mcp http --config path/to/config.json`

## Metrics

- Prometheus-compatible metrics are exposed at `GET /metrics` by default.
- Customize the path via `TRANSLOADIT_MCP_METRICS_PATH` or config `metricsPath`.
- Disable by setting `metricsPath: false` in the config or when creating the server/router.
- Optional basic auth via `TRANSLOADIT_MCP_METRICS_USER` +
  `TRANSLOADIT_MCP_METRICS_PASSWORD` or config `metricsAuth`.

## Input files

```ts
export type InputFile =
  | { kind: 'path'; field: string; path: string }
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

## Limits

These limits apply only to inline JSON/base64 payloads. Small files can be sent inline, but large
files should be passed as `path` or `url`. The MCP server uploads those via tus (the default), so
the request body stays small and no extra MCP/LLM token budget is consumed.

- Hosted default request body limit: **1 MB** (JSON).
- Hosted default `maxBase64Bytes`: **512_000** (decoded bytes).
- Self-hosted default request body limit: **10 MB** (configurable).

## URL inputs

- By default URL files are **downloaded and uploaded via tus**. This keeps instructions unchanged
  and avoids large inline payloads (the transfer happens out-of-band).
- If instructions already contain an `/http/import` step, the MCP server sets/overrides its `url`.
  - If multiple URLs and a single `/http/import` step exists, it supplies a `url` array.
- When `template_id` (or `builtin_template`) is used, the MCP server fetches the template and
  chooses the safest URL path:
  - If the merged template contains a `/http/import` step, it overrides that step’s `url`.
  - If the template expects uploads (`:original` / `/upload/handle`), it downloads and uploads via
    tus.
  - If the template doesn’t take inputs (for example `/html/convert` with a `url`), URL inputs are
    ignored and a warning is returned.
  - If `allow_steps_override=false` and the template only supports `/http/import`, URL inputs are
    rejected (no safe override path).

## Local vs hosted file access

- `path` inputs only work when the MCP server can read the same filesystem (local/stdio).
- Hosted MCP cannot access your disk. Use `url`/`base64` for small files, or upload locally with:
  `npx -y @transloadit/node upload ./file.ext --create-upload-endpoint <tus_url> --assembly <assembly_url> --field :original`
- For remote flows, create the Assembly with `expected_uploads` so it stays open for out‑of‑band
  tus uploads.

## Resume behavior

If `assembly_url` is provided, the MCP server resumes uploads using Assembly status
(`tus_uploads` + `uploads`). This requires stable, unique `field` names and file metadata
(`filename` + `size`). Only **path-based** inputs resume; non-file inputs start fresh uploads.

## Tool surface

- `transloadit_create_assembly`
- `transloadit_get_assembly_status`
- `transloadit_wait_for_assembly`
- `transloadit_lint_assembly_instructions`
- `transloadit_list_robots`
- `transloadit_get_robot_help`
- `transloadit_list_builtin_templates`

## Roadmap

- Next.js Claude Web flow to mint and hand off bearer tokens for MCP.
