---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/mcp-server': patch
---

Add `transloadit init upload-once <directory>` with a versioned, runnable example that reuses the
existing browser login, Storage receipt/checksum handling and Smart CDN signer. Scaffold without
uploads or public policy changes, reuse matching originals on subsequent runs, and keep one
maintained example for the CLI and documentation.
