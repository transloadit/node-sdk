---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
'@transloadit/mcp-server': patch
---

Contract: sync API2’s `/ai/chat` file compatibility, PDF layout extraction, video normalization,
and DAM folder-listing schemas ([#11612](https://github.com/transloadit/api2/pull/11612),
[#11630](https://github.com/transloadit/api2/pull/11630),
[#11657](https://github.com/transloadit/api2/pull/11657),
[#11682](https://github.com/transloadit/api2/pull/11682),
[#11373](https://github.com/transloadit/api2/pull/11373), and
[#11639](https://github.com/transloadit/api2/pull/11639)).

- `/document/extract` accepts the `docling` text method and `json_layout` format. The layout
  output schema describes pages, blocks, and table cells.
- Type-breaking: the parsed `/document/extract` method and format unions include `docling` and
  `json_layout`, respectively. Update exhaustive handlers for either union to cover the new value.
- Type-breaking: parsed `RobotDocumentExtractInstructions` now require `keep_page_headers` and
  `keep_page_footers`. Both fields are optional on input and default to `false` during parsing.
- Type-breaking: parsed `/video/encode` and `/video/ondemand` Instructions with hidden fields now
  include `normalize_hdr`, defaulting to `false`. If you construct either parsed type directly,
  set the field. The field remains optional in the corresponding input types.
