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

CLI:

- `transloadit-mcp http --host 127.0.0.1 --port 5723 --endpoint https://api2.transloadit.com`
- `transloadit-mcp http --config path/to/config.json`

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

- Hosted default request body limit: **1 MB** (JSON).
- Hosted default `maxBase64Bytes`: **512_000** (decoded bytes).
- Self-hosted default request body limit: **10 MB** (configurable).

## URL inputs

- By default URL files are **downloaded and uploaded via tus** (no instruction mutation).
- If instructions already contain an `/http/import` step, the MCP server sets/overrides its `url`.
  - If multiple URLs and a single `/http/import` step exists, it supplies a `url` array.

## Resume behavior

If `assembly_url` is provided, the MCP server resumes uploads using Assembly status
(`tus_uploads` + `uploads`). This requires stable, unique `field` names and file metadata
(`filename` + `size`). Only **path-based** inputs resume; non-file inputs start fresh uploads.

## Tool surface

- `transloadit_create_assembly`
- `transloadit_get_assembly_status`
- `transloadit_wait_for_assembly`
- `transloadit_validate_assembly`
- `transloadit_list_robots`
- `transloadit_get_robot_help`
- `transloadit_list_golden_templates`

## Roadmap

- Next.js Claude Web flow to mint and hand off bearer tokens for MCP.
