---
"@transloadit/node": patch
"transloadit": patch
"@transloadit/mcp-server": patch
---

Remove Sharp from automatic SDK installation and the ordinary import graph, fixing the 4.13.0
Supabase Edge bundle-size regression. Ordinary uploads and verified Storage receipts no longer
decode images locally. Existing blur hashes remain usable.

`storeImage()` and `storage store` no longer generate new blur hashes. Image uploads and
server-verified dimensions are unchanged; receipts without hashes render without a blur background.
