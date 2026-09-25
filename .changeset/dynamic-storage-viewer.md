---
'@transloadit/viewer': patch
'@transloadit/node': patch
'@transloadit/mcp-server': patch
'transloadit': patch
'@transloadit/types': patch
'@transloadit/zod': patch
---

Add alpha React receipt images and a Web-standard Storage authorization route. Each preview,
original, and download request checks live application access before redirecting to an exact
retained version, with a finite rendition policy and private no-store responses.

Expose strict, pure retained Assembly result extraction through narrow Zod v3/v4 entries and
reuse it in the Node SDK, preserving receipt provenance and failed-Assembly errors. Utils and
Viewer gain no runtime dependencies.
