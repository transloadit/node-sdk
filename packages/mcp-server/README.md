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

The hosted endpoint asks you to sign in before any tool runs, Robot docs and linting included,
because MCP clients only start OAuth when the endpoint challenges them. Robot docs and linting ask
for no scopes. To use them without an account, run the server yourself (see Self-hosted).

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
```

Codex opens the consent page right away. To sign in again later, run
`codex mcp login transloadit`.

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

Auth Keys sign with one HMAC algorithm. Keys created in the Console with "Allow signing Smart CDN
URLs" (the default) require `sha256`, so add `TRANSLOADIT_SIGNATURE_ALGORITHM=sha256`, as the
Console's snippet for the key shows. Other keys use the default `sha384`. A mismatch fails with
`mcp_invalid_signature`, and its hint names the algorithm the key requires.

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

For HTTP mode via Docker, override the `stdio` entrypoint, expose the port, and set a transport
token, which binding to `0.0.0.0` requires:

```bash
export TRANSLOADIT_MCP_TOKEN="$(openssl rand -hex 32)"
docker run --rm \
  -e TRANSLOADIT_KEY=MY_AUTH_KEY \
  -e TRANSLOADIT_SECRET=MY_SECRET_KEY \
  -e TRANSLOADIT_MCP_TOKEN \
  -p 5723:5723 \
  --entrypoint transloadit-mcp \
  ghcr.io/transloadit/mcp-server:latest \
  http --host 0.0.0.0 --port 5723
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
- This includes a bare `GET /mcp`, because some clients (Codex) discover the authorization server
  from that probe. Directory health checks therefore see `401` instead of `200`; the JSON body
  still carries `name`, `status` and `docs`. Self-hosted and unauthenticated deployments keep
  answering the bare `GET` with `200`.
- Bearer tokens (OAuth or minted with `--aud mcp`) are forwarded to API2, which verifies them on
  every call. A rejected or expired token yields a tool result with `isError` and
  `_meta["mcp/www_authenticate"]`, so ChatGPT and Claude prompt you to reconnect.
- Each tool declares `securitySchemes` (top level and in `_meta`). Because the hosted endpoint
  challenges every unauthenticated request, all tools declare `oauth2` there; the Robot docs and
  linting tools ask for no scopes.
- A rejected or expired key/secret on a self-hosted server is reported as
  `mcp_credentials_rejected` without an OAuth challenge, since only an operator can fix it.
- Browser requests must come from ChatGPT, Claude, Transloadit or loopback origins; requests without
  an `Origin` header (CLIs, servers) are not restricted. Set `allowedOrigins` to change the list.
- `TRANSLOADIT_MCP_UPSTREAM_SECRET` is set by Transloadit's own deployment so API2 can tell that a
  relayed `aud=mcp` token arrives from the hosted service; it is not needed for self-hosting.
  Hosted mode refuses to start without it, because every authenticated call would fail.

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
- `TRANSLOADIT_SIGNATURE_ALGORITHM` (optional, `sha1`, `sha256` or `sha384`, default `sha384`;
  must match the Auth Key)
- `TRANSLOADIT_MCP_TOKEN`
- `TRANSLOADIT_MCP_RESOURCE_METADATA_URL` (hosted mode: protected-resource metadata URL to
  advertise in `401` challenges)
- `TRANSLOADIT_MCP_UPSTREAM_SECRET` (hosted mode only, set by Transloadit's deployment; sent to
  API2 as `Transloadit-Mcp-Upstream` next to forwarded bearer tokens)
- `TRANSLOADIT_MCP_RESULT_DOMAINS` (optional, comma-separated origins the result widget may load
  previews from; default `https://*.transloadit.com,https://*.transloadit.net,https://*.r2.dev`)
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
`allowedOrigins`, `resourceMetadataUrl`, `signatureAlgorithm`, `resultDomains` and `consoleUrl`.

## Tool surface

| Tool                                     | Account | OAuth scopes                         | Notes                                           |
| ---------------------------------------- | ------- | ------------------------------------ | ----------------------------------------------- |
| `transloadit_lint_assembly_instructions` | no      | none                                 | read-only                                       |
| `transloadit_list_robots`                | no      | none                                 | read-only                                       |
| `transloadit_get_robot_help`             | no      | none                                 | read-only                                       |
| `transloadit_create_assembly`            | yes     | `assemblies:write`, `templates:read` | destructive, open-world (URL imports), widget   |
| `transloadit_get_assembly_status`        | yes     | `assemblies:read`                    | read-only                                       |
| `transloadit_wait_for_assembly`          | yes     | `assemblies:read`                    | read-only, result widget                        |
| `transloadit_list_templates`             | yes     | `templates:read`                     | read-only                                       |
| `transloadit_get_profile`                | yes     | `assemblies:read`, `templates:read`  | read-only, `_meta["openai/profile"]`            |

Every tool carries `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint` and
`openWorldHint` annotations. `transloadit_create_assembly` is the only destructive one: export
Robots such as `/s3/store` can overwrite files at their destination, so hosts should confirm it.

`securitySchemes` depend on how the server runs: hosted (`TRANSLOADIT_MCP_RESOURCE_METADATA_URL`)
declares `oauth2` with the scopes above for every tool; a server holding `TRANSLOADIT_KEY` and
`TRANSLOADIT_SECRET` declares `noauth` everywhere; otherwise the account tools declare `oauth2` and
the others `noauth`. `TRANSLOADIT_MCP_TOKEN` and `TRANSLOADIT_MCP_RESOURCE_METADATA_URL` cannot be
combined.

`transloadit_list_templates` supports:

- `include_builtin`: `all`, `latest`, `exclusively-all`, `exclusively-latest`
- `include_content`: include parsed `steps` in each template item

`transloadit_get_profile` returns `{ id, name?, nickname? }` for the Workspace behind the current
credentials, derived from the Workspace's own Assemblies or Templates.

### Result widget

`transloadit_create_assembly` and `transloadit_wait_for_assembly` link the MCP Apps resource
`ui://transloadit/assembly-result` (`_meta.ui.resourceUri`, also `_meta["openai/outputTemplate"]`).
Hosts that support MCP Apps render each Step's results with image, video and audio previews,
download links, an "Open in Console" link and a "Save as Template" shortcut. It speaks the MCP Apps
`2026-01-26` protocol (`ui/initialize` with `appInfo`) and also reads ChatGPT's `window.openai`.
Its CSP allows `https://*.transloadit.com`, `https://*.transloadit.net` and `https://*.r2.dev`
(result buckets); override the list with `TRANSLOADIT_MCP_RESULT_DOMAINS` or `resultDomains`.

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

### Files that exist only locally or in your sandbox

If the file exists only locally or in your sandbox, call `transloadit_create_assembly` with
`expected_uploads` and run the returned `upload_instructions`; this needs outbound HTTPS from the
sandbox to Transloadit (Claude.ai: Settings → code execution network access must allow it). Hosts
such as Claude.ai do not hand chat attachments to connector tools, and base64 in tool arguments is
impractical for anything but tiny files, so the agent uploads the file itself:

1. Call `transloadit_create_assembly` with your instructions and `expected_uploads: 1` (one per
   file, at most 100 per call). The call returns right away, even with `wait_for_completion: true`,
   because the Assembly now waits for those uploads.
2. Each `upload_instructions` entry has the tus endpoint, the tus metadata (`assembly_url`,
   `fieldname`) and a ready-to-run `curl` command. Set `FILE` to the file's path and run it in a
   bash shell; it prints `201` once the file is uploaded (tus creation-with-upload, one request).
3. Call `transloadit_wait_for_assembly` with the Assembly URL.

The commands contain no credentials: the Assembly URL is the only capability, and it lets the holder
add files to that one Assembly while it waits for uploads.

## Limits

These limits apply to inline JSON/base64 payloads. For larger files, use a public URL or upload from
your own machine with `npx -y @transloadit/node upload`.

- Hosted default request body limit: **1 MiB**
- Hosted `maxBase64Bytes`: **512,000** decoded bytes
- Self-hosted default request body limit: **10 MiB**

Set `maxRequestBodyBytes` (handler option or JSON config key) to change the body limit; larger
requests get HTTP 413 and are not buffered. Express apps that install their own body parser set
its limit there.

URL inputs that the server downloads (for templates that expect uploads) are capped at 1 GiB in
total per call and 10 minutes per download, redirects included; set `maxUrlDownloadBytes` and
`urlDownloadTimeoutMs` to change that. On the hosted
endpoint the caller's token is checked with API2 before anything is downloaded.

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
