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

- Add the `/document/watermark` Robot, `credentials` and the `elevenlabs` provider for
  `/speech/transcribe` and `/text/speak`, `speaker_colors` for `/video/subtitle`, `inpainting` for
  `/image/generate`, `download` for `/file/serve`, `return_file_stubs` for `/transloadit/import`,
  `search` for Storage asset lists, and the `type` of OCR entries.
- The default ImageMagick stack is now `v2.0.11`; `v2.0.10` and `v3.0.1` remain accepted as
  deprecated aliases of `v2.0.11` and `v3.0.2`.
- Type-breaking: `/video/merge` no longer supplies `framerate: '1/5'` when parsing. Parsed
  `framerate` can be `undefined`; API2 applies its default. Readers of parsed Instructions should
  handle a missing value.
- Type-breaking: `/document/split` `pages` also accepts positive integers, so parsed `pages` can
  contain numbers as well as strings. Readers of parsed Instructions should handle both.
- Type-breaking: `/speech/transcribe` and `/text/speak` parsed `provider` can also be `elevenlabs`.
  Exhaustive handling of providers needs the new value.
- Type-breaking: parsed Robot unions and Robot name enums include `/document/watermark`
  (`DocumentWatermarkRobot`), and the image generation model list includes
  `openai/gpt-image-2.6-flare` and `openai/gpt-image-2.6-sunburst`. Exhaustive switches need the
  new members.
- Type-breaking: Robot metadata no longer has `applyCommunityPlanMediaTrim`; it is replaced by
  `planMediaTrim` and `planWatermarkOutput`. Code reading Robot metadata should use those fields.
