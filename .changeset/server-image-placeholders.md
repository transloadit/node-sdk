---
"@transloadit/node": minor
"transloadit": minor
"@transloadit/types": minor
"@transloadit/zod": minor
"@transloadit/mcp-server": patch
"@transloadit/viewer": patch
---

Request server-generated image placeholders with `storeImage(..., { placeholder: 'blur' })`
or `storage store --placeholder blur`, without adding a native image decoder to the SDK.
Extraction is optional and best-effort; successful extraction adds metadata usage equal to 20%
of the file's bytes. Omission performs no extraction.

Preserve `thumbhash` and `has_alpha` in Storage receipts, native asset reads, Assembly recovery,
batch results and catalog sync. Viewer remains alpha and accepts server alpha metadata as well
as older `hasAlpha` catalogs. Private request-authorized delivery still omits inline preview pixels.
Hashed upload replays never overwrite or re-upload an image to generate missing metadata.

Release MCP alongside the SDK to keep its validated dependency versions aligned.
