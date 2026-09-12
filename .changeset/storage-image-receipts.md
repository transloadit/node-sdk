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
