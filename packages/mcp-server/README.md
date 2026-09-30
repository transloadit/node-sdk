# @transloadit/mcp-server

Transloadit MCP Server (Streamable HTTP + stdio), built on top of `@transloadit/node`.

## Connect by URL (recommended)

The hosted server lives at:

```text
https://api2.transloadit.com/mcp
```

Add it to your MCP client by URL. The client discovers API2 as the OAuth authorization server,
opens a browser consent page in the Transloadit Console, and keeps a short-lived token plus refresh
token for you. No API keys leave your Workspace.

Browsing Robots (`transloadit_list_robots`, `transloadit_get_robot_help`) and linting Assembly
Instructions work before you sign in; creating Assemblies and listing Templates ask you to connect
your Workspace first.

### Claude Code

```bash
claude mcp add --transport http transloadit https://api2.transloadit.com/mcp
claude mcp login transloadit
```

For non-interactive runs (for example `claude -p`), explicitly allow MCP tools:

```bash
claude -p "List templates" \
  --allowedTools mcp__transloadit__* \
  --output-format json
```

### Claude.ai and Claude Desktop

Settings → Connectors → Add custom connector → enter `https://api2.transloadit.com/mcp`. Claude
registers itself with API2 and opens the consent page.

### ChatGPT

Settings → Apps & Connectors → Advanced → Developer mode → Create, then enter the URL above with
authentication set to OAuth. Files you attach in the chat are handed to
`transloadit_create_assembly` as `attachments`; results render in the Assembly result widget.

The plugin manifest for the ChatGPT and Codex catalog (`plugin.json`, `mcp.json` and the
`.codex-plugin/plugin.json` fallback) lives in this package directory. It points at the hosted
server and at the Agent Skills catalog at `https://transloadit.com/.well-known/skills/index.json`
instead of bundling skill files.

### Codex

```bash
codex mcp add transloadit --url https://api2.transloadit.com/mcp
codex mcp login transloadit
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.transloadit]
url = "https://api2.transloadit.com/mcp"
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "transloadit": {
      "url": "https://api2.transloadit.com/mcp"
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector --cli https://api2.transloadit.com/mcp
```

## CI and headless agents

Where no browser is available, mint a bearer token from an Auth Key and pass it as
`Authorization: Bearer <token>`:

```bash
npx -y @transloadit/node auth token --aud mcp
```

Generate this token in a trusted environment (backend, CI, or local shell), then hand it to the
agent runtime. You can mint it via:

- CLI: `npx -y @transloadit/node auth token --aud mcp`
- API: `POST https://api2.transloadit.com/token` (HTTP Basic Auth with key/secret)
- Node SDK: instantiate `Transloadit` with `authKey` + `authSecret`, then call
  `client.mintBearerToken({ aud: 'mcp' })`

Interactive CLI sessions can also run `npx -y @transloadit/node auth login` (device flow) and reuse
the stored credentials.

Bearer tokens satisfy signature auth on API2 requests; signature checks apply to key/secret
requests.

## Self-hosted

Run the server where your agent runs, set `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET`, and the server
handles API auth automatically.

### Install

```bash
npm install @transloadit/mcp-server
```

### Stdio

```bash
TRANSLOADIT_KEY=MY_AUTH_KEY TRANSLOADIT_SECRET=MY_SECRET_KEY npx -y @transloadit/mcp-server stdio
```

### HTTP

```bash
TRANSLOADIT_KEY=MY_AUTH_KEY TRANSLOADIT_SECRET=MY_SECRET_KEY \
npx -y @transloadit/mcp-server http --host 127.0.0.1 --port 5723
```

When binding HTTP mode to non-localhost hosts, `TRANSLOADIT_MCP_TOKEN` (or the hosted-mode
`TRANSLOADIT_MCP_RESOURCE_METADATA_URL`) is required.

### Docker

```bash
docker run -i --rm \
  -e TRANSLOADIT_KEY=MY_AUTH_KEY \
  -e TRANSLOADIT_SECRET=MY_SECRET_KEY \
  ghcr.io/transloadit/mcp-server:latest
```

For HTTP mode via Docker, expose the port:

```bash
docker run --rm \
  -e TRANSLOADIT_KEY=MY_AUTH_KEY \
  -e TRANSLOADIT_SECRET=MY_SECRET_KEY \
  -p 5723:5723 \
  ghcr.io/transloadit/mcp-server:latest \
  transloadit-mcp http --host 0.0.0.0 --port 5723
```

### `TRANSLOADIT_MCP_TOKEN` explained

`TRANSLOADIT_MCP_TOKEN` is a self-hosted MCP transport token. It protects your own HTTP MCP endpoint
(`npx -y @transloadit/mcp-server http`), not API2.

- Set it yourself to any high-entropy secret.
- Send it from your MCP client as `Authorization: Bearer <TRANSLOADIT_MCP_TOKEN>`.
- It is **not** minted via `/token`.
- It is separate from API2 Bearer tokens used for `https://api2.transloadit.com/mcp`.

Generate one, then start HTTP mode:

```bash
export TRANSLOADIT_MCP_TOKEN="$(openssl rand -hex 32)"
npx -y @transloadit/mcp-server http --host 0.0.0.0 --port 5723
```

### Self-hosted client setup

Most self-hosted users add the server to their MCP client and let the client start it via stdio.

#### Claude Code

```bash
claude mcp add --transport stdio transloadit \
  --env TRANSLOADIT_KEY=... \
  --env TRANSLOADIT_SECRET=... \
  -- npx -y @transloadit/mcp-server stdio
```

#### Codex CLI

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

#### Gemini CLI

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

#### Cursor

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

#### OpenCode

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

## Auth model

### Hosted (`https://api2.transloadit.com/mcp`)

- Requests without a bearer token get `401` with
  `WWW-Authenticate: Bearer resource_metadata="https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp"`.
  MCP clients follow that document to API2's authorization server (authorization code + PKCE,
  Dynamic Client Registration or Client ID Metadata Documents).
- Bearer tokens (OAuth or minted with `--aud mcp`) are forwarded to API2, which verifies them on
  every call. A rejected or expired token yields a tool result with `isError` and
  `_meta["mcp/www_authenticate"]`, so ChatGPT and Claude prompt you to reconnect.
- Each tool declares `securitySchemes`: `noauth` for Robot docs and linting, `oauth2` with the
  scopes it needs (`assemblies:write`, `assemblies:read`, `templates:read`) otherwise.
- Browser requests must come from ChatGPT, Claude, Transloadit or loopback origins; requests without
  an `Origin` header (CLIs, servers) are not restricted. Set `allowedOrigins` to change the list.

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
- `TRANSLOADIT_MCP_RESOURCE_METADATA_URL` (hosted mode: protected-resource metadata URL to
  advertise in `401` challenges)
- `TRANSLOADIT_MCP_CONSOLE_URL` (optional, default `https://transloadit.com`; Console origin for
  widget deep links)
- `TRANSLOADIT_ENDPOINT` (optional, default `https://api2.transloadit.com`)
- `TRANSLOADIT_MCP_METRICS_PATH` (optional, default `/metrics`)
- `TRANSLOADIT_MCP_METRICS_USER` (optional)
- `TRANSLOADIT_MCP_METRICS_PASSWORD` (optional)

### CLI flags

- `npx -y @transloadit/mcp-server http --host 127.0.0.1 --port 5723`
- `npx -y @transloadit/mcp-server http --endpoint https://api2.transloadit.com`
- `npx -y @transloadit/mcp-server http --config path/to/config.json`

The JSON config accepts the same keys as `createTransloaditMcpHttpHandler()`, including
`allowedOrigins`, `resourceMetadataUrl` and `consoleUrl`.

## Tool surface

| Tool                                    | Auth                        | Notes                                    |
| --------------------------------------- | --------------------------- | ---------------------------------------- |
| `transloadit_lint_assembly_instructions` | none                        | read-only                                |
| `transloadit_list_robots`               | none                        | read-only                                |
| `transloadit_get_robot_help`            | none                        | read-only                                |
| `transloadit_create_assembly`           | `oauth2` `assemblies:write` | open-world (URL imports), result widget  |
| `transloadit_get_assembly_status`       | `oauth2` `assemblies:read`  | read-only                                |
| `transloadit_wait_for_assembly`         | `oauth2` `assemblies:read`  | read-only, result widget                 |
| `transloadit_list_templates`            | `oauth2` `templates:read`   | read-only                                |
| `transloadit_get_profile`               | `oauth2`                    | read-only, `_meta["openai/profile"]`     |

Every tool carries `title`, `readOnlyHint`, `destructiveHint` (always `false`), `idempotentHint`
and `openWorldHint` annotations.

`transloadit_list_templates` supports:

- `include_builtin`: `all`, `latest`, `exclusively-all`, `exclusively-latest`
- `include_content`: include parsed `steps` in each template item

`transloadit_get_profile` returns `{ id, name?, nickname? }` for the Workspace behind the current
credentials, derived from the Workspace's own Assemblies or Templates.

### Result widget

`transloadit_create_assembly` and `transloadit_wait_for_assembly` link the MCP Apps resource
`ui://transloadit/assembly-result` (`_meta.ui.resourceUri`, also `_meta["openai/outputTemplate"]`).
Hosts that support MCP Apps render each Step's results with image, video and audio previews,
download links, an "Open in Console" link and a "Save as Template" shortcut. The widget only needs
`https://*.transloadit.com` and `https://*.transloadit.net` in its CSP.

## Input files

```ts
export type InputFile =
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

Hosts that attach chat files (ChatGPT) pass them under `attachments` instead, as declared by
`_meta["openai/fileParams"]`:

```ts
type Attachment = {
  download_url: string
  file_id: string
  mime_type?: string
  file_name?: string
}
```

Each attachment becomes a URL input (`attachment_1`, `attachment_2`, …) and follows the URL rules
below.

## Limits

These limits apply to inline JSON/base64 payloads. For larger files, use a public URL or upload from
your own machine with `npx -y @transloadit/node upload`.

- Hosted default request body limit: **1 MB**
- Hosted `maxBase64Bytes`: **512,000** decoded bytes
- Self-hosted default request body limit: **10 MB** (configurable)

## URL inputs and template behavior

For URL inputs, behavior depends on the template/instructions:

- If an `/http/import` Step exists, MCP sets/overrides that Step's `url`.
- If the template expects uploads (`:original` or `/upload/handle`), MCP downloads then uploads via
  tus. These downloads require public HTTP(S) URLs; private-network targets are rejected, including
  redirects to private addresses.
- If the template does not take input files, URL inputs are ignored and a warning is returned.
- If `allow_steps_override=false` and only `/http/import` would work, URL inputs are rejected.

## Local vs hosted file access

- MCP accepts base64 and URL inputs in both self-hosted and hosted deployments. Local filesystem
  paths are not supported as tool inputs.
- **Migration:** clients that previously sent `kind: 'path'` must switch to base64, a public URL,
  or a local CLI upload. This also applies to stdio and self-hosted servers.
- Use public `url` inputs, small `base64` payloads, or upload locally with
  `npx -y @transloadit/node upload`.
- Use `expected_uploads` to keep an Assembly open for out-of-band tus uploads.

## Resume behavior

If `assembly_url` is provided, MCP resumes uploads using Assembly status (`tus_uploads` +
`uploads`). This requires stable field names and file metadata (`filename` + `size`).
Resubmit the same base64 or public URL input to resume an upload. URL inputs are downloaded and
uploaded even when the original instructions are omitted; resumption does not modify the existing
Assembly's Steps. The file's contents, field name, and filename must remain unchanged.
This resumes tus uploads; URL imports performed by `/http/import` do not need to be resubmitted.

Assembly IDs must contain 32 hexadecimal characters. Assembly URLs must refer to a Transloadit host
or the explicitly configured API origin, without credentials, query parameters, or fragments.
MCP extracts the ID and resolves the Assembly through its configured API endpoint; it never fetches
the caller-supplied Assembly URL directly. MCP does not follow API response redirects, including an
Assembly's `redirect_url`. A custom endpoint can use a local origin for development,
but this does not enable private-network URL file downloads.

## Metrics and server card

- Prometheus metrics at `GET /metrics` by default.
- Configure via `TRANSLOADIT_MCP_METRICS_PATH` or `metricsPath`.
- Disable via `metricsPath: false`.
- Optional metrics basic auth via `TRANSLOADIT_MCP_METRICS_USER` +
  `TRANSLOADIT_MCP_METRICS_PASSWORD` or `metricsAuth`.
- Public discovery endpoint at `/.well-known/mcp/server-card.json`, listing every tool with its
  annotations and security schemes and, in hosted mode, the OAuth resource metadata URL.

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
