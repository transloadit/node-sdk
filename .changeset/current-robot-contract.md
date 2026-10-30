---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
'@transloadit/mcp-server': patch
---

Contract: sync current Robot schemas from API2, including Supabase user session tokens
(transloadit/api2#10239), document Markdown/HTML extraction (transloadit/api2#10323),
SFTP defaults (transloadit/api2#10379), and concat/thumbnail defaults (transloadit/api2#10554).

- Accept `session_token` on `/supabase/store` in the CLI and generated types and Zod schemas.
- Forward unknown top-level CLI Step parameters with a warning so new API parameters remain
  usable before the next schema sync. Known parameters, nested objects, and Robot names still
  undergo local validation. Warnings contain parameter names, never their values.
- Type-breaking: `/video/thumbs` no longer supplies an empty `offsets` array when parsing, and
  rejects explicitly empty arrays. Parsed `offsets` can be `undefined`; omit the parameter
  instead of supplying `[]`.
- Type-breaking: `/document/extract` parsed `text_format` can also be `md` or `html`. Handle
  these values when reading parsed instructions, or select `txt`/`json` explicitly.
- Parsed contract defaults now match API2: SFTP uses port 22, `/video/concat` fade durations
  default to zero, `/video/thumbs` uses an opaque black background, and `/transloadit/store`
  defaults `result` to `true`. When `/file/preview` receives a `strategy` object without an
  `image` entry, that entry now defaults to `['image', 'embedded-preview', 'icon']`.
