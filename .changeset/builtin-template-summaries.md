---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
---

Contract: sync the Builtin Template summaries from API2 (transloadit/api2#10406). Builtin catalog
items parse the optional `summary` that `listTemplates({ include_builtin: 'exclusively-all' })`
returns, and `mcpBuiltinTemplateSummaries` exports the same summaries for the MCP-approved
Builtins, keyed like `mcpBuiltinTemplateManifest`.
