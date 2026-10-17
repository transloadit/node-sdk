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

Explicit schema validation now requires `ocr_provider` for OCR text extraction and rejects
native-only `password`, `page_range`, and page granularity with OCR. Thumbnail numeric offsets
must be finite. Validate complete, merged instructions; use `assemblies lint --template` when
linting Template overrides. The CLI warns about the new OCR constraints while reading Steps
files or signing parameters, allowing overrides whose remaining parameters come from the
original Assembly or Template to reach API2 for validation.

Zod v4 preserves the synced speech-vocabulary checks for case-insensitive uniqueness and the
200-byte joined UTF-8 budget, matching Zod v3 and API2.
