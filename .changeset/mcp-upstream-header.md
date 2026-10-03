---
"@transloadit/node": minor
"transloadit": minor
---

Add an `extraHeaders` client option so trusted relays such as the hosted MCP service can send a
fixed header (`Transloadit-Mcp-Upstream`) with every API request next to a forwarded bearer token.
Like `Authorization`, these headers are dropped when a redirect leaves the API origin.

`listTemplates()` also accepts `fields`, for API2 columns such as `account_id` that the default
Template list omits.

`prepareInputFiles()` accepts `maxUrlDownloadBytes` (a total for the call) and `urlDownloadTimeoutMs`
(one deadline per download, redirects included) to bound URL downloads and `beforeUrlDownload` to vouch for a requester before a file is fetched locally; its
download errors name only a URL's origin and path, never presigned query parameters.
`createAssembly()` accepts `onAssemblyCreated`, called once API2 accepted the creation request.
