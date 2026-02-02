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

- `TRANSLOADIT_KEY` / `TRANSLOADIT_SECRET` (required for API requests, and for accounts enforcing
  signature auth)
- `TRANSLOADIT_MCP_TOKEN` (optional for static bearer auth on non-localhost HTTP)
- `TRANSLOADIT_API` (optional, defaults to api2.transloadit.com)

## Tool surface

See the design spec for all tools, inputs, and outputs:

- `docs/mcp-spec.md`
- `docs/mcp-todo.md`

## Notes

- Hosted MCP calls use bearer tokens. If the account enforces signature auth, you must still provide
  `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET`.
- URL inputs default to safe handling; base64 inputs have explicit limits to keep requests small.

