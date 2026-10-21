---
'@transloadit/mcp-server': minor
---

Builtin shortcuts send URL inputs to Transloadit as `input_url` with `template_id` (transloadit/api2#10292) when every file and attachment of the call is a URL and the Builtin accepts it. Transloadit fetches the files itself, so the Assembly is created at once, the MCP server downloads nothing and large files no longer run into the wait budget. Mixed inputs keep the download-and-upload path, as do calls that API2 refuses `input_url` for or that reach an API2 host without `input_url` support.
