---
'@transloadit/node': patch
'@transloadit/mcp-server': patch
'transloadit': patch
---

Keep CLI download filenames and HLS directories aligned with Assembly results, omit input parent folders from output paths, and support HTTP(S) URL inputs for Assembly and prompt commands.

Directory runs process inputs again to discover the result filenames instead of guessing freshness from upload names. Watch updates reuse their own result paths, while existing unrelated files and outputs from other inputs remain separate.
