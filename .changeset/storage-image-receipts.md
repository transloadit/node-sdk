---
"@transloadit/node": minor
"transloadit": minor
"@transloadit/mcp-server": patch
---

Add `client.storeImage(filePath, { path })` for one original Storage image without overwriting.
Stream the checksum and verify the completed receipt, including path, asset ID, bytes and
EXIF-oriented display dimensions.
Return typed metadata suitable for saving and rendering without another lookup. Preserve Assembly
upload progress, cancellation and errors; receipt validation after a write is not a rollback.

Add `transloadit storage store <file> <path> --receipts images.json` using the CLI's existing
Assembly credentials. Atomically append keyed receipts, preserve previous data on failures and
reject concurrent writers, then print a ready-to-render StorageImage snippet.
