---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/mcp-server': patch
'@transloadit/utils': minor
---

Store mixed-media originals with `storeAsset()` and recover verified receipts without uploading.
The Storage CLI checkpoints both image and file receipts in one catalog, skips matching replays,
and stops with recoverable evidence if the server changes original bytes. Viewer remains image-only.
Add `getPublicStoredAssetUrl()` for version-pinned originals, downloads and bounded still previews.
Its new Built-ins require the corresponding API2 deployment before adoption; URL construction
does not publish assets. Existing `storeImage()` behavior is preserved.

The generic CLI intentionally now requires unchanged original bytes, including for images: a
server-transformed upload exits nonzero after saving its actual receipt instead of silently
accepting a watermark. It uses the `file` upload field. Use the existing SDK `storeImage()` API
when deliberately accepting transformed image bytes.

Plain and hashed replays both trust the local receipt's byte hash and do not verify live existence.
Refresh stale catalogs with `storage receipts sync`; incomplete legacy receipts require recovery
before replay. Sync cannot generate a missing checksum. Dimensionless files and unknown MIME types
remain in `files` outside Viewer's typed map; new uploads and sync require an explicit image MIME
type to classify an entry as a Viewer image. Existing catalogs remain readable.
