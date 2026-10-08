---
'@transloadit/node': patch
'transloadit': patch
'@transloadit/mcp-server': patch
'@transloadit/types': patch
'@transloadit/zod': patch
---

Refresh Robot schemas and documentation from alphalib, including Google image seed guidance,
Google Storage permissions, crop fallback metadata, HTTP import URL boundaries, and AI Chat model
support and exact optional input types. Accept the new GOOGLE_STORE_ACCESS_DENIED and
DAM_STORAGE_UNAVAILABLE Assembly errors without expanding the SDK's operator dependencies.
