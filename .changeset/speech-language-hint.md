---
'@transloadit/node': patch
'transloadit': patch
'@transloadit/mcp-server': patch
---

Correct the `speech transcribe --target-language` help and example: this is a spoken-language hint for Replicate using a full lowercase English name such as `french`. It does not translate speech; AWS and GCP use `--source-language` instead.
