---
'@transloadit/viewer': minor
'@transloadit/utils': patch
---

Viewer now uses the direct-encode Storage previews: `builtin/storage-preview@0.0.4` for private
delivery and `builtin/public-preview@0.0.3` for public delivery. Both preserve the exact asset and
version, with no path-based fallback. Public previews retain their 4096px and quality-85 limits.

Breaking (Viewer alpha): these replace the previous preview pins. Remove overrides for older
Storage preview Built-ins; no legacy-version adapter is provided. Deploy the new API2 Built-ins and
their worker/FileInfoReader dependencies before adopting this release. Custom non-Storage Templates
and original/download delivery are unchanged.
