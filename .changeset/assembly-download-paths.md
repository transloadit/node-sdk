---
'@transloadit/node': patch
'@transloadit/mcp-server': patch
'transloadit': patch
---

Keep CLI download filenames and HLS directories aligned with Assembly results, omit input parent folders from output paths, and support HTTP(S) URL inputs for Assembly and prompt commands.

Independent HLS bundles returned by the same Step get separate source folders so their playlist and segment paths can coexist.

Reserve result paths with filesystem case sensitivity and file/directory conflicts in mind. Stage linked watch downloads before publishing them together, and validate local steps and output options before fetching URL inputs.

Directory runs process inputs again to discover the result filenames instead of guessing freshness from upload names. Watch updates reuse their own result paths, while existing unrelated files and outputs from other inputs remain separate.
