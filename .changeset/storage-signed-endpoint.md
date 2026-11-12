---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Storage requests (`getStoredAsset`, `listStoredAssets`, `moveStoredAsset` and `deleteStoredAsset`) now sign their HTTP method and URL path into `params.auth` as `method` and `path`, as the Transloadit API requires for Storage requests.
