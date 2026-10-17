---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
'@transloadit/mcp-server': patch
---

Contract: sync Robot schemas from API2 (transloadit/api2#9897, transloadit/api2#9938)
and share the approved MCP Builtin manifest.

- Type-breaking: `/video/subtitle` no longer fills in `font`, `font_size` and `bold` while
  parsing. Parsed values (`RobotVideoSubtitleInstructions`, `AssemblyInstructions`,
  `schema.parse()`) can be `undefined`; the API still applies Arial, 16 and `false`, or the
  `social` style’s defaults. Instruction input types are unchanged.
- Type-breaking: `/video/thumbs` accepts `null` for `offsets`, `width` and `height`, so parsed
  values can be `null`. Treat `null` like an omitted value.

The CLI warns about new OCR dependency constraints without blocking Steps overrides whose
remaining parameters come from a Template. Explicit schema validation remains strict.
