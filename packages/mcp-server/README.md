# @transloadit/mcp-server

Transloadit MCP Server (Streamable HTTP + stdio), built on top of `@transloadit/node`.

## Install

```bash
npm install @transloadit/mcp-server
```

## Quick start (self-hosted, recommended)

For most teams, self-hosted MCP is the simplest happy path: run the server where your agent runs,
set `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET`, and the server handles API auth automatically.

### Stdio (recommended)

```bash
TRANSLOADIT_KEY=MY_AUTH_KEY TRANSLOADIT_SECRET=MY_SECRET_KEY npx -y @transloadit/mcp-server stdio
```

### HTTP

```bash
TRANSLOADIT_KEY=MY_AUTH_KEY TRANSLOADIT_SECRET=MY_SECRET_KEY \
transloadit-mcp http --host 127.0.0.1 --port 5723
```

When binding HTTP mode to non-localhost hosts, `TRANSLOADIT_MCP_TOKEN` is required.

### `TRANSLOADIT_MCP_TOKEN` explained

`TRANSLOADIT_MCP_TOKEN` is a self-hosted MCP transport token. It protects your own HTTP MCP endpoint
(`transloadit-mcp http`), not API2.

- Set it yourself to any high-entropy secret.
- Send it from your MCP client as `Authorization: Bearer <TRANSLOADIT_MCP_TOKEN>`.
- It is **not** minted via `/token`.
- It is separate from API2 Bearer tokens used for `https://api2.transloadit.com/mcp`.

Generate one, then start HTTP mode:

```bash
export TRANSLOADIT_MCP_TOKEN=\"$(openssl rand -hex 32)\"
transloadit-mcp http --host 0.0.0.0 --port 5723
```

## Hosted endpoint

If you cannot run `npx` where the agent runs, use the hosted endpoint:

```text
https://api2.transloadit.com/mcp
```

Use `Authorization: Bearer <token>`. Mint a token with:

```bash
npx -y @transloadit/node auth token --aud mcp
```

or `POST https://api2.transloadit.com/token` (HTTP Basic Auth with key/secret).

Bearer tokens satisfy signature auth on API2 requests; signature checks apply to key/secret
requests.

## Agent client setup

Most users add the server to their MCP client and let the client start it automatically via stdio.

### Claude Code

```bash
claude mcp add --transport stdio transloadit \
  --env TRANSLOADIT_KEY=... \
  --env TRANSLOADIT_SECRET=... \
  -- npx -y @transloadit/mcp-server stdio
```

For non-interactive runs (for example `claude -p`), explicitly allow MCP tools:

```bash
claude -p "List templates" \
  --allowedTools mcp__transloadit__* \
  --output-format json
```

### Codex CLI

```bash
codex mcp add transloadit \
  --env TRANSLOADIT_KEY=... \
  --env TRANSLOADIT_SECRET=... \
  -- npx -y @transloadit/mcp-server stdio
```

Allowlist tools in `~/.codex/config.toml`:

```toml
[mcp_servers.transloadit]
command = "npx"
args = ["-y", "@transloadit/mcp-server", "stdio"]
enabled_tools = ["transloadit_list_templates"]
```

### Gemini CLI

```bash
gemini mcp add --scope user transloadit npx -y @transloadit/mcp-server stdio \
  --env TRANSLOADIT_KEY=... \
  --env TRANSLOADIT_SECRET=...
```

Allowlist tools in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "transloadit": {
      "command": "npx",
      "args": ["-y", "@transloadit/mcp-server", "stdio"],
      "env": {
        "TRANSLOADIT_KEY": "...",
        "TRANSLOADIT_SECRET": "..."
      },
      "includeTools": ["transloadit_list_templates"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "transloadit": {
      "command": "npx",
      "args": ["-y", "@transloadit/mcp-server", "stdio"],
      "env": {
        "TRANSLOADIT_KEY": "...",
        "TRANSLOADIT_SECRET": "..."
      }
    }
  }
}
```

### OpenCode

`~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "transloadit": {
      "command": "npx",
      "args": ["-y", "@transloadit/mcp-server", "stdio"],
      "env": {
        "TRANSLOADIT_KEY": "...",
        "TRANSLOADIT_SECRET": "..."
      }
    }
  }
}
```

## Run the server manually

HTTP:

```bash
transloadit-mcp http --host 127.0.0.1 --port 5723
```

Stdio:

```bash
transloadit-mcp stdio
```

## Auth model

### Hosted (`https://api2.transloadit.com/mcp`)

- Mint token via `POST https://api2.transloadit.com/token`.
- Send `Authorization: Bearer <access_token>`.
- Bearer auth satisfies signature auth; signature checks apply to key/secret requests.

### Self-hosted

- Stdio and localhost HTTP need no MCP auth by default.
- Non-localhost HTTP requires `TRANSLOADIT_MCP_TOKEN` (a static secret you define).
- Live Transloadit API calls use:
  - incoming Bearer token from MCP request headers, or
  - `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET`.

## Configuration

### Environment variables

- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`
- `TRANSLOADIT_MCP_TOKEN`
- `TRANSLOADIT_ENDPOINT` (optional, default `https://api2.transloadit.com`)
- `TRANSLOADIT_MCP_METRICS_PATH` (optional, default `/metrics`)
- `TRANSLOADIT_MCP_METRICS_USER` (optional)
- `TRANSLOADIT_MCP_METRICS_PASSWORD` (optional)

### CLI flags

- `transloadit-mcp http --host 127.0.0.1 --port 5723`
- `transloadit-mcp http --endpoint https://api2.transloadit.com`
- `transloadit-mcp http --config path/to/config.json`

## Tool surface

- `transloadit_lint_assembly_instructions`
- `transloadit_create_assembly`
- `transloadit_get_assembly_status`
- `transloadit_wait_for_assembly`
- `transloadit_list_robots`
- `transloadit_get_robot_help`
- `transloadit_list_templates`

`transloadit_list_templates` supports:

- `include_builtin`: `all`, `latest`, `exclusively-all`, `exclusively-latest`
- `include_content`: include parsed `steps` in each template item

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

These limits apply to inline JSON/base64 payloads. For larger files, prefer `path` or `url`.

- Hosted default request body limit: **1 MB**
- Hosted `maxBase64Bytes`: **512,000** decoded bytes
- Self-hosted default request body limit: **10 MB** (configurable)

## URL inputs and template behavior

For URL inputs, behavior depends on the template/instructions:

- If an `/http/import` Step exists, MCP sets/overrides that Step's `url`.
- If the template expects uploads (`:original` or `/upload/handle`), MCP downloads then uploads via
  tus.
- If the template does not take input files, URL inputs are ignored and a warning is returned.
- If `allow_steps_override=false` and only `/http/import` would work, URL inputs are rejected.

## Local vs hosted file access

- `path` inputs require filesystem access from the MCP process (local/self-hosted).
- Hosted MCP cannot read local disk.
- For remote workflows, use `url`, small `base64`, or upload locally with
  `npx -y @transloadit/node upload`.
- Use `expected_uploads` to keep an Assembly open for out-of-band tus uploads.

## Resume behavior

If `assembly_url` is provided, MCP resumes uploads using Assembly status (`tus_uploads` +
`uploads`). This requires stable field names and file metadata (`filename` + `size`).
Path-based file inputs can be resumed.

## Metrics and server card

- Prometheus metrics at `GET /metrics` by default.
- Configure via `TRANSLOADIT_MCP_METRICS_PATH` or `metricsPath`.
- Disable via `metricsPath: false`.
- Optional metrics basic auth via `TRANSLOADIT_MCP_METRICS_USER` +
  `TRANSLOADIT_MCP_METRICS_PASSWORD` or `metricsAuth`.
- Public discovery endpoint at `/.well-known/mcp/server-card.json`.

## MCP vs skills/CLI

- Use MCP for embedded runtime execution (uploads, Assemblies, polling, results).
- Use skills/CLI for human-directed and one-off workflows (setup, scaffolding, local automation).

These are guidelines, not strict rules. Many teams use both.

## Verify MCP clients

Run a local smoke test with published MCP server and installed CLIs (Claude Code, Codex CLI,
Gemini CLI). Requires `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET` and active CLI auth.

```bash
node scripts/verify-mcp-clients.ts
```

Set `MCP_VERIFY_TIMEOUT_MS` to override command timeout.

## Docs

- Website docs: https://transloadit.com/docs/sdks/mcp-server/
- API token docs: https://transloadit.com/docs/api/token-post/

## Contributing

### Prerequisites

- Node.js 22+
- Corepack-enabled Yarn 4

### Install dependencies

From repo root:

```bash
corepack yarn install
```

### Validate changes

```bash
corepack yarn --cwd packages/mcp-server check
```

### Run e2e tests

`test:e2e` requires valid Transloadit credentials in your environment.

```bash
corepack yarn --cwd packages/mcp-server test:e2e
```

### Submit a change

- Add or update tests with behavior changes.
- Keep README and website docs aligned for user-facing behavior.
- Open a PR in `transloadit/node-sdk`.

### Roadmap

- Next.js Claude Web flow to mint and hand off bearer tokens for MCP.
