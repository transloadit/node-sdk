---
'@transloadit/mcp-server': minor
---

Add `transloadit_search_docs` for relevance search through the website’s documentation search API,
with optional section and result limits. Add `transloadit_get_doc` for streamed Markdown with
Unicode character pagination and a default page size of 15,000 characters. Both tools fetch only
public Transloadit documentation, return sanitized errors and suggest relevant follow-up tools.
