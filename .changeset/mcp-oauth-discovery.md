---
"@transloadit/mcp-server": minor
---

Let MCP clients connect to the hosted server by URL and satisfy the ChatGPT plugin and Claude
connector requirements.

- Hosted mode (`TRANSLOADIT_MCP_RESOURCE_METADATA_URL`): unauthenticated requests get a `401` with
  `WWW-Authenticate: Bearer resource_metadata="…"`, browser Origins are limited to ChatGPT, Claude,
  Transloadit and loopback (overridable with `allowedOrigins`), and the server card advertises
  OAuth. Self-hosted `TRANSLOADIT_MCP_TOKEN` behavior is unchanged.
- Every tool carries a title, `readOnlyHint`/`destructiveHint`/`openWorldHint`/`idempotentHint`
  annotations and per-tool `securitySchemes` (`noauth` for Robots and linting, `oauth2` with scopes
  elsewhere), mirrored in `_meta.securitySchemes`. Auth failures return `isError` results with
  `_meta["mcp/www_authenticate"]` so hosts show their account-linking UI.
- New `transloadit_get_profile` tool (`_meta["openai/profile"]`) returns the Workspace behind the
  credentials for multi-account hosts.
- `transloadit_create_assembly` accepts ChatGPT-attached files through `attachments`
  (`_meta["openai/fileParams"]`), mapped onto the existing URL-input path.
- MCP Apps result widget `ui://transloadit/assembly-result` with previews, download links and a
  Save as Template shortcut, linked from the Assembly tools with `_meta.ui.resourceUri`.
- `plugin.json`, `mcp.json` and `.codex-plugin/plugin.json` describe the ChatGPT and Codex plugin.
