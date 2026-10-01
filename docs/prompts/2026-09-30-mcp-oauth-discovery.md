# MCP server: OAuth discovery, tool annotations, file params and result widget

Part of the ChatGPT plugin plan in Content: `repodocs/prompts/2026-09-30-chatgpt-plugin-plan.md`
(branch `chatgpt-plugin-plan`). This note is the node-sdk half. Sibling branches: api2
`agent/mcp-oauth-authcode` (authorization-code grant, DCR, CIMD, protected-resource metadata) and
Content `chatgpt-plugin-plan` (consent page at `/c/oauth/authorize`, QA scenario).

Pull requests: api2 [#9320](https://github.com/transloadit/api2/pull/9320), Content
[#6207](https://github.com/transloadit/content/pull/6207), node-sdk
[#529](https://github.com/transloadit/node-sdk/pull/529).

The hosted `https://api2.transloadit.com/mcp` endpoint must let MCP clients discover API2 as its
authorization server and must satisfy the ChatGPT plugin and Anthropic connector directory review
requirements. The same package also gains the ChatGPT-specific pieces from Phase 1 of the plan:
OpenAI file params on `transloadit_create_assembly` and an MCP Apps result widget.

## Existing pieces

- `packages/mcp-server/src/http.ts`, `http-request-handler.ts`, `http-helpers.ts`: Streamable HTTP
  transport, static `TRANSLOADIT_MCP_TOKEN` check for self-hosted deployments, CORS.
- `packages/mcp-server/src/server.ts`: tool registrations (`registerTool`), per-request bearer
  extraction (`extractBearerToken`) forwarded to API2.
- `packages/mcp-server/src/server-card.ts`: `/.well-known/mcp/server-card.json` content used by
  API2.
- `packages/node/src/cli/deviceLogin.ts`: `transloadit auth login` (device flow, already shipped).
- `@modelcontextprotocol/sdk` ≥ 1.29 ships `server/auth` helpers (`requireBearerAuth`,
  protected-resource metadata router). Prefer them over hand-rolled headers where they fit the
  existing transport code.

## Checklist

### Discovery and auth (Phase 0)

- [x] Hosted mode: unauthenticated `/mcp` requests return `401` with
      `WWW-Authenticate: Bearer resource_metadata="https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp"`.
      Keep the friendly JSON on bare `GET` without `Accept: text/event-stream` for directory
      health probes. Self-hosted mode keeps `TRANSLOADIT_MCP_TOKEN` behavior.
- [x] Per-tool `securitySchemes`: `noauth` for `transloadit_list_robots`,
      `transloadit_get_robot_help`, `transloadit_lint_assembly_instructions`; `oauth2` with the
      scopes each tool needs for `create_assembly`, `get_assembly_status`, `wait_for_assembly`,
      `list_templates`. Mirror them in `_meta["securitySchemes"]` for clients that only read
      `_meta`.
- [x] Tool results that fail on auth carry `_meta["mcp/www_authenticate"]` with `error` and
      `error_description` so ChatGPT shows the account-linking UI.
- [x] Origin validation on the hosted endpoint (allow `chatgpt.com`, `claude.ai`, `claude.com`,
      Transloadit origins and loopback; reject others).
- [x] Every tool gets a `title` and accurate `readOnlyHint`, `destructiveHint`, `openWorldHint`
      (`true` for URL imports).
- [x] Optional profile tool marked `_meta["openai/profile"]: true` returning a stable opaque
      workspace id, so multi-account works in ChatGPT.
- [x] Server card advertises the OAuth-by-URL path; README puts "connect by URL" first and moves
      minted bearer tokens to the CI/headless section; drop the device-login TODO.

### ChatGPT plugin surface (Phase 1)

- [x] `_meta["openai/fileParams"]: ["files"]` on `transloadit_create_assembly` with the required
      file object schema (`download_url`, `file_id` required; `mime_type`, `file_name` optional,
      nothing else required). Map each entry onto the existing URL-import path.
- [x] MCP Apps result widget (`_meta.ui.resourceUri`, `ui://transloadit/assembly-result`): per-Step
      preview (image, video, audio, document thumbnail), before/after for image Steps, download
      links, "Save as Template" when authenticated. Set `_meta.ui.csp.connectDomains` and
      `resourceDomains` to Transloadit result origins and `_meta.ui.domain` to a dedicated origin.
- [x] `_meta["openai/toolInvocation/invoking"]` / `invoked` status strings (≤ 64 chars).
- [x] `plugin.json` with `extensions.com.openai` (presentation, registered MCP server, hooks) and
      `.codex-plugin/plugin.json` fallback; bundle the `transloadit/skills` catalog within OpenAI's
      limits (5 skills, 100 files each, 256 KiB `SKILL.md`).
- [x] Tests: unit tests for the 401/metadata behavior, security schemes, file-param mapping and
      widget resource.
- [ ] E2e against devdock once the api2 branch serves the metadata.

## QA follow-up (2026-10-01, session 2fe9f3b7)

- [x] Hosted mode answers every unauthenticated request to `/mcp`, including a bare `GET` (Codex
      probes with `Accept: */*`), with the `401` challenge; the body keeps `name`/`status`/`docs`.
      Self-hosted and unauthenticated deployments keep the bare-`GET` `200`.
- [x] Widget handshake matches MCP Apps `2026-01-26` as implemented by ext-apps `82221c0c`
      (`ui/initialize` with `appInfo`, param-less `ui/notifications/initialized`, `ping` and
      `ui/resource-teardown` replies, tool-input/cancelled states, failed results shown). The
      spec prose still shows `clientInfo`; the reference App and AppBridge use `appInfo`.
- [x] CORS allows `Mcp-Protocol-Version` and exposes `Mcp-Session-Id` and `WWW-Authenticate`.
- [x] Widget CSP adds `https://*.r2.dev`; `TRANSLOADIT_MCP_RESULT_DOMAINS` / `resultDomains`
      override it. Previews retry briefly because R2 can lag the Assembly's completion.
- [x] `TRANSLOADIT_SIGNATURE_ALGORITHM` / `signatureAlgorithm` (`sha1`, `sha256`, `sha384`) reach
      the SDK; Console keys with Smart CDN signing require `sha256`. `INVALID_SIGNATURE` returns
      `mcp_invalid_signature` with a hint naming the required algorithm.
- Verified: devdock bare `GET /mcp` → `401` with the challenge; a self-hosted server with the QA
  Console key lists templates once `TRANSLOADIT_SIGNATURE_ALGORITHM=sha256` is set; the widget
  renders both previews in the ext-apps basic host
  (`/tmp/mcp-oauth/runs/node-sdk-fixes/basic-host-widget.png`). The basic host build bakes its
  sandbox port, so Content's `mcp-oauth-apps-host.ts --sandbox-port` has no effect with
  `--skip-build`; use the default ports.

## Getting a local build into devdock

API2's container bind-mounts the api2 worktree at `/srv/current` and runs the `mcp-server` service
from the worktree's `api2/node_modules/@transloadit/mcp-server`. To test this branch:

```bash
cd ~/code/node-sdk && corepack yarn build
rm -rf ~/code/api2-clone-1/api2/node_modules/@transloadit/mcp-server/dist
cp -r packages/mcp-server/dist ~/code/api2-clone-1/api2/node_modules/@transloadit/mcp-server/dist
# The MCP server relies on the `extraHeaders` client option that only exists in this branch's
# @transloadit/node; the published 4.14.0 in API2's node_modules silently drops the
# `Transloadit-Mcp-Upstream` header, so copy that dist too.
rm -rf ~/code/api2-clone-1/api2/node_modules/@transloadit/node/dist
cp -r packages/node/dist ~/code/api2-clone-1/api2/node_modules/@transloadit/node/dist
cd ~/code/api2-clone-1 && core/bin/devdock.ts --app api2 restart -s mcp-server
```

The service also needs `TRANSLOADIT_MCP_RESOURCE_METADATA_URL`, `TRANSLOADIT_MCP_UPSTREAM_SECRET`
(matching API2's expected value) and `TRANSLOADIT_ENDPOINT` in its environment; api2's service
config on `agent/mcp-oauth-authcode` sets them.

Verified on devdock (2026-09-30) with this branch's `dist` and the api2 branch's service environment:
`POST /mcp` without a token returns `401` with
`WWW-Authenticate: Bearer resource_metadata="https://api2-devdock.transloadit.dev/.well-known/oauth-protected-resource/mcp"`,
the bare `GET` health probe stays `200`, `tools/list` shows `securitySchemes`, `openai/fileParams`
and the widget link, and `resources/read` serves `ui://transloadit/assembly-result`. The server card
at `/.well-known/mcp/server-card.json` is rendered by the API2 process from its own import of the
package, so it only picks up the new tools and OAuth schemes after API2 restarts with the bumped
dependency and passes `resourceMetadataUrl` to `buildServerCard()`.

Once published from this branch, API2 must bump `@transloadit/node` (patch, brings `extraHeaders`)
and `@transloadit/mcp-server` (minor) together; bumping only the MCP server leaves the upstream
header unsent.
