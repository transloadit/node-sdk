---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
'@transloadit/mcp-server': patch
---

Contract: sync current Robot schemas from API2, including `/document/watermark`
(transloadit/api2#10828, transloadit/api2#10845), ElevenLabs for `/speech/transcribe` and
`/text/speak` (transloadit/api2#10988), per-speaker subtitle colors (transloadit/api2#10816),
image inpainting controls (transloadit/api2#11270), merge framerates (transloadit/api2#10943),
`/document/split` page numbers (transloadit/api2#11155), Storage asset search
(transloadit/api2#10693), and the upgraded ImageMagick stacks (transloadit/api2#10616).

- Add the `/document/watermark` Robot; the `elevenlabs` provider for `/speech/transcribe` and
  `/text/speak`, with `credentials` naming the Template Credential that stores your ElevenLabs
  key (keep keys in Template Credentials, not in Steps); `speaker_colors` for
  `/video/subtitle`; `inpainting` for `/image/generate`; `download` for `/file/serve`;
  `return_file_stubs` for `/transloadit/import`; and the optional `type` of OCR entries.
- `@transloadit/zod` adds the `/document/watermark` schemas, `robots/_image-inpainting` and
  `robots/_image-inpainting-docs`, `damFilenameSearchMaxCodePoints`, `defaultMaxFilesPerJob`,
  `dominantColorSampleMaxDimension`, `elevenLabsKeytermLimits`, `fileDecompressExtractionLimits`
  and `fileDecompressTimeout`. `@transloadit/types` adds the matching types.
- `listStoredAssets()` now sends `search` to filter by filename; earlier releases dropped it and
  listed everything. An empty, `null` or omitted `search` still lists everything. A `search`
  longer than 255 code points now throws before the request is sent.
- The default ImageMagick stack is now `v2.0.11`. The SDK still accepts `v2.0.9`, `v2.0.10`,
  `v3.0.0` and `v3.0.1` and sends them as written. API2 lists them as deprecated and runs them on
  `v2.0.11` or `v3.0.2`, and may return a deprecation warning. Per the `/image/resize` docs,
  these stacks update RAW decoding: “Your RAW conversions will look slightly different, including
  small color and detail changes.”
- `transloadit auth signature` and `transloadit templates sync` keep emitting what the previous
  release emitted for unchanged input, so signed params and synced Template files stay the same:
  - they add no `inpainting`, `download` or `return_file_stubs`, and still add
    `framerate: '1/5'` to `/video/merge` and `imagemagick_stack: 'v2.0.10'` (which API2 now
    upgrades, see above) where a Step sets neither;
  - `download`, `inpainting`, `return_file_stubs`, `credentials` and `speaker_colors` are
    forwarded exactly as written, without validation, for API2 to check, as before. They no
    longer print the “Unrecognized step parameters” warning;
  - `/speech/transcribe` with `provider: 'elevenlabs'` gets no `source_language` default, so the
    language is detected unless the Step sets one.
  Set these parameters in the Step to choose other values.
- Other CLI commands that read Steps (`assemblies create --steps`, `templates create` and
  `templates modify`) now validate those five parameters instead of forwarding them with a
  warning: for example `download: null` or `speaker_colors: []` is rejected, and
  `download: 'false'` is sent as `false`.
- Type-breaking: parsed `/file/serve` Instructions (`RobotFileServeInstructions`,
  `schema.parse()`) always contain `download`, defaulting to `false`. Code that builds values of
  the parsed type must set it; instruction input types are unchanged.
- Type-breaking: parsed `/image/generate` Instructions (`RobotImageGenerateInstructions`) always
  contain `inpainting`, defaulting to `'best_effort'`. Code that builds values of the parsed type
  must set it; instruction input types are unchanged.
- Type-breaking: parsed `/transloadit/import` Instructions (`RobotTransloaditImportInstructions`)
  always contain `return_file_stubs`, defaulting to `false`. Code that builds values of the parsed
  type must set it; instruction input types are unchanged.
- Type-breaking: `/video/merge` no longer supplies `framerate: '1/5'` when parsing. Parsed
  `framerate` can be `undefined`; API2 applies its default. Readers of parsed Instructions should
  handle a missing value.
- Type-breaking: `/document/split` `pages` also accepts positive integers, so parsed `pages` can
  contain numbers as well as strings. Readers of parsed Instructions should handle both.
- Type-breaking: `/speech/transcribe` and `/text/speak` parsed `provider` can also be `elevenlabs`.
  Exhaustive handling of providers needs the new value.
- Type-breaking: parsed Robot unions and Robot name enums include `/document/watermark`
  (`DocumentWatermarkRobot`). Exhaustive switches over Robots need the new member.
- Type-breaking: `imageGenerateModelIdentifiers` includes `openai/gpt-image-2.6-flare` and
  `openai/gpt-image-2.6-sunburst`. Exhaustive switches over image generation models need the new
  members.
- Type-breaking: Robot metadata no longer has `applyCommunityPlanMediaTrim`; it is replaced by
  `planMediaTrim` and `planWatermarkOutput`. Code reading Robot metadata should use those fields.
- Type-breaking: `runtimeStackVersions.imagemagick` now has the literal types `default: 'v2.0.11'`
  and `valid: ['v2.0.11', 'v3.0.2']`, and `deprecated['v2.0.9']` and `deprecated['v3.0.0']` are
  now `'v2.0.11'` and `'v3.0.2'`. Code that compares these constants with `'v2.0.10'` or
  `'v3.0.1'` should compare with the new versions or widen to `string`.
