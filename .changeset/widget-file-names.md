---
'@transloadit/mcp-server': patch
---

Show result file names decoded in the Assembly result widget. Files imported from a URL keep its percent-encoding in their name, so `Kennedy%27s_Speech.mp4` now reads as `Kennedy's_Speech.mp4`. Malformed sequences, and ones that would decode into control, bidi or path separator characters, keep the name as reported. Download links still use the file's own URL.
