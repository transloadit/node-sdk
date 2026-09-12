---
'@transloadit/node': patch
'@transloadit/types': patch
'@transloadit/zod': patch
'transloadit': patch
'@transloadit/mcp-server': patch
---

Include the Transloadit Storage import and store Robots in the offline catalog and generated
instructions, and type the optional `asset_id` in Assembly results. Recognize Storage import/store
error codes in response validation and terminal-status helpers, preserving API errors while polling.
