---
'@transloadit/mcp-server': patch
---

Show completed Assembly result files as readable Step names, file names and download URLs in tool
text, so clients without a result widget can link to the outputs. Prefer signed download URLs when
available. Keep metadata for the first 20 files in text and report the remaining count, while
keeping all results in structured output and the result widget.
