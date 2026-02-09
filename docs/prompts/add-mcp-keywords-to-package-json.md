# Add MCP/AI keywords to @transloadit/mcp-server package.json

## Task

Add discoverability keywords to `packages/mcp-server/package.json` so the MCP server shows up in npm
searches for AI/MCP/agent tooling.

## What to do

In `packages/mcp-server/package.json`, add a `keywords` array (or extend the existing one) with
these keywords:

```json
"keywords": [
  "mcp",
  "model-context-protocol",
  "ai",
  "claude",
  "llm",
  "media",
  "video",
  "image",
  "audio",
  "document",
  "transloadit",
  "file-processing",
  "upload",
  "encoding",
  "agent"
]
```

## Why

These keywords improve discoverability on npm and in MCP registry searches. The MCP ecosystem is
growing fast and users search for servers by capability (`video`, `image`, `media`) and protocol
(`mcp`, `model-context-protocol`). Having these in place before registry submissions ensures
consistent metadata across npm, GitHub, and every directory we list in.

## Verification

After making the change, run `corepack yarn check` from the repo root to ensure nothing breaks.
