---
'@transloadit/node': patch
'@transloadit/mcp-server': patch
'transloadit': patch
---

Close SDK-opened upload file streams before a failed or aborted `createAssembly()` rejects, so callers can immediately remove temporary files without leaking file handles.
