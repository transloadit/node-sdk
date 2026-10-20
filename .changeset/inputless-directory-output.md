---
'@transloadit/node': patch
'@transloadit/mcp-server': patch
'transloadit': patch
---

Fix directory downloads for Assemblies without uploads, including import-only and prompt-only Steps, saving results as `<output>/<step>/<result name>`. Only infer stdin uploads from pipes or redirected files, and use the existing stdin stream for uploads so agent shells and CI do not reopen `/dev/stdin`.
