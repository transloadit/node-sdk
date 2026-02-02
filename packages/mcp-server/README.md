# @transloadit/mcp-server

Transloadit MCP server (Streamable HTTP + stdio).

This package provides a thin MCP wrapper around `@transloadit/node` for creating, validating, and
monitoring Transloadit Assemblies with a delightful, agent-friendly DX.

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

## Environment

- `TRANSLOADIT_KEY` / `TRANSLOADIT_SECRET` (required for API requests)
- `TRANSLOADIT_MCP_TOKEN` (optional for static bearer auth on non-localhost HTTP)
- `TRANSLOADIT_ENDPOINT` (optional, defaults to `https://api2.transloadit.com`)

## Tool surface

See the MCP section in the repo README for the full tool list, auth model, and input formats.

## Notes

- Hosted MCP calls use bearer tokens minted via `/token`.
- Bearer tokens satisfy signature auth; signature checks apply only to key/secret requests.
- URL inputs default to safe handling; base64 inputs have explicit limits to keep requests small.
