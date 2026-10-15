---
"@transloadit/mcp-server": patch
---

Keep the Assembly result widget compact when uploads are listed with the results: the shared grid is decided on the result Steps alone, uploads fold into an "Uploaded files" row at the bottom (and are listed once even when a Template also exports them as `:original`), and a result that would grow taller than 720px scrolls inside the card when the host sets no maxHeight.
