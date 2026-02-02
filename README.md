[![Build Status](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/transloadit/node-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/transloadit/node-sdk)

<a href="https://transloadit.com/?utm_source=github&utm_medium=referral&utm_campaign=sdks&utm_content=node_sdk">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg">
    <img src="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg" alt="Transloadit Logo">
  </picture>
</a>

# Transloadit JavaScript/TypeScript SDKs

Monorepo for Transloadit SDKs, shared packages, and the MCP server.

## Packages

- `@transloadit/node` — Node.js SDK + CLI. See `packages/node/README.md`.
- `transloadit` — Stable unscoped package (built from `@transloadit/node`).
- `@transloadit/mcp-server` — MCP server (Streamable HTTP + stdio).
- `@transloadit/types` — Shared TypeScript types.
- `@transloadit/utils` — Shared utilities.
- `@transloadit/zod` — Zod schemas for Transloadit APIs.

## Quick start

### Node SDK

```ts
import { Transloadit } from '@transloadit/node'

const client = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY as string,
  authSecret: process.env.TRANSLOADIT_SECRET as string,
})

const result = await client.createAssembly({
  params: {
    steps: {
      ':original': { robot: '/upload/handle' },
    },
  },
  files: { file: '/path/to/file.jpg' },
  waitForCompletion: true,
})
```

### MCP server (local)

```bash
npx @transloadit/mcp-server stdio
```

```bash
npx @transloadit/mcp-server http --host 127.0.0.1 --port 5723
```

## MCP server design

The MCP server is thin glue over `@transloadit/node` and shared libraries. It exposes a small,
agent-friendly tool surface while delegating all heavy lifting (uploads, polling, linting, resumes)
to the SDK.

### Transports

- Streamable HTTP at `/mcp`.
- stdio transport for local execution.
- No legacy SSE.

### Auth model

**Hosted (api2.transloadit.com/mcp)**

- Call `POST https://api2.transloadit.com/token` with Auth Key/Secret (HTTP Basic Auth).
- Use `Authorization: Bearer <access_token>` on API2 requests.
- Bearer tokens **satisfy signature auth**; signature checks are enforced only for key/secret
  requests.

**Self-hosted**

- stdio and localhost HTTP require no MCP auth by default.
- Non-localhost HTTP requires `TRANSLOADIT_MCP_TOKEN`.
- API calls use `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET`, or bearer tokens if provided.

### Configuration

Environment:

- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`
- `TRANSLOADIT_MCP_TOKEN`
- `TRANSLOADIT_ENDPOINT` (optional, default `https://api2.transloadit.com`)

CLI:

- `transloadit-mcp http --host 127.0.0.1 --port 5723 --endpoint https://api2.transloadit.com`
- `transloadit-mcp http --config path/to/config.json`

### Input files

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

### Limits

- Hosted default request body limit: **1 MB** (JSON).
- Hosted default `maxBase64Bytes`: **512_000** (decoded bytes).
- Self-hosted default request body limit: **10 MB** (configurable).

### URL inputs

- By default URL files are **downloaded and uploaded via tus** (no instruction mutation).
- If instructions already contain an `/http/import` step, the MCP server sets/overrides its `url`.
  - If multiple URLs and a single `/http/import` step exists, it supplies a `url` array.

### Resume behavior

If `assembly_url` is provided, the MCP server resumes uploads using Assembly status
(`tus_uploads` + `uploads`). This requires stable, unique `field` names and file metadata
(`filename` + `size`). Only **path-based** inputs resume; non-file inputs start fresh uploads.

### Tool surface

- `transloadit_create_assembly`
- `transloadit_get_assembly_status`
- `transloadit_wait_for_assembly`
- `transloadit_validate_assembly`
- `transloadit_list_robots`
- `transloadit_get_robot_help`
- `transloadit_list_golden_templates`

### Roadmap

- Next.js Claude Web flow to mint and hand off bearer tokens for MCP.

## Development

- Install: `corepack yarn`
- Checks + unit tests: `corepack yarn check`
- Node SDK unit tests: `corepack yarn workspace @transloadit/node test:unit`

## Repo notes

- Docs live under `docs/` (non-MCP).
- The `transloadit` package is prepared via `scripts/prepare-transloadit.ts`.
