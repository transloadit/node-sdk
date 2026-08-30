---
"@transloadit/utils": minor
---

Add the rest of the Smart CDN URL grammar next to `getSignedSmartCdnUrl`, so applications stop
carrying their own copies: `getSmartCdnUrl` (unsigned builder), `parseSmartCdnUrl` (the inverse of
the builders — decodes once, keeps repeated query parameters, returns `auth_key`/`exp`/`sig` as
`auth`) and `stripSmartCdnAuth` (removes the signature parameters byte-for-byte otherwise). Both
builders accept a trusted `baseUrl` option (for example a local api2's URL Transform endpoint with
a `{workspace}` placeholder); the signature does not cover the host, so it must come from
configuration, never from user input. Exported from the root and the `./node` entry.
