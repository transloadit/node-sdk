import { z } from 'zod'

export const builtinTemplateDocSchema = z
  .object({
    id: z.string(),
    base: z.string(),
    version: z.string(),
    description: z.string(),
    input: z.enum(['upload', 'remote_url', 'none']),
    required_fields: z.array(z.string()),
    optional_fields: z.array(
      z
        .object({
          name: z.string(),
          default: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict()

export const builtinTemplateDocsSchema = z.array(builtinTemplateDocSchema)

export type BuiltinTemplateDoc = z.infer<typeof builtinTemplateDocSchema>

/** Standalone catalog JSON Schema, or null when a Builtin has no declared fields contract. */
export const builtinTemplateFieldsSchema = z.record(z.string(), z.unknown()).nullable()

/**
 * Runtime catalog projection used by Builtin clients. API2 supplies descriptions, tool-ready
 * summaries, field schemas and defaults; absent and null schemas remain distinct, and neither
 * declares a usable contract.
 */
export const builtinTemplateCatalogItemSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  summary: z.string().optional(),
  fields_schema: builtinTemplateFieldsSchema.optional(),
  content: z.object({ fields: z.record(z.string(), z.unknown()).default({}) }),
})

/** Runtime catalog item after missing fields have been normalized to an empty object. */
export type BuiltinTemplateCatalogItem = z.infer<typeof builtinTemplateCatalogItemSchema>

/**
 * MCP channel approvals: exact reviewed versions and temporarily excluded field values.
 * Membership is explicit; a catalog schema, a new Builtin version, or Storage eligibility does
 * not grant MCP approval. Keep runtime descriptions, summaries, schemas and defaults in API2's
 * catalog.
 */
export const mcpBuiltinTemplateManifest: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  'builtin/caption-video@0.0.1': {},
  'builtin/capture-webpage@0.0.1': {},
  'builtin/convert-to-pdf@0.0.1': {},
  // Remove only after api2#9960 is deployed and its VP8/turbo output is verified.
  'builtin/encode-video@0.0.1': { preset: ['webm'] },
  'builtin/extract-text@0.0.1': {},
  'builtin/prepare-image@0.0.1': {},
  'builtin/remove-background@0.0.1': {},
  'builtin/transcribe@0.0.1': {},
  'builtin/video-covers@0.0.1': {},
}

/**
 * MCP-approved Builtins whose upload input API2 replaces with `input_url` (api2#10292), with the
 * most URLs each takes. API2 opts Builtins in explicitly (`allowInputImport`) without publishing
 * that in the catalog, so this mirrors its `builtinInputImportTemplateNames` for the approved
 * versions. `caption-video` pairs outputs per original and therefore takes exactly one URL.
 */
export const mcpBuiltinInputUrlMaxCounts: Readonly<Record<string, number>> = {
  'builtin/caption-video@0.0.1': 1,
  'builtin/convert-to-pdf@0.0.1': 10,
  'builtin/encode-video@0.0.1': 10,
  'builtin/extract-text@0.0.1': 10,
  'builtin/prepare-image@0.0.1': 10,
  'builtin/remove-background@0.0.1': 10,
  'builtin/transcribe@0.0.1': 10,
  'builtin/video-covers@0.0.1': 10,
}

/**
 * Static summaries of the MCP-approved Builtins, for clients that describe them before reading
 * API2's catalog, such as server cards and directory listings. API2 authors each `summary` beside
 * its Builtin definition and serves the same text in the Template list; its tests keep this copy
 * equal to those definitions, so edit the definition first.
 */
export const mcpBuiltinTemplateSummaries: Readonly<Record<string, string>> = {
  'builtin/caption-video@0.0.1':
    'Transcribe the speech in videos and burn plain captions into each original video. Returns the captioned video and its SRT captions. Fields set the caption font_size (default 16), position, font_color and border_color. The automatic provider detects the spoken language; target_language (such as french) hints it, and source_language (default en-US) sets it for provider aws or gcp. Captions are never translated.',
  'builtin/capture-webpage@0.0.1':
    'Capture a public HTTP(S) webpage (url) or an uploaded HTML file as a PNG, JPEG or PDF. Returns one image or PDF per captured page. Defaults to a full-page PNG 1024 pixels wide; set fullpage to false for a fixed width × height viewport, and use delay or wait_until for late-loading pages. A url takes precedence over uploaded HTML. No custom headers, credentials or browser actions are sent.',
  'builtin/convert-to-pdf@0.0.1':
    'Convert Office documents, HTML, Markdown and plain text files to PDF. Returns one PDF per input. Fields set the paper size (pdf_format, default Letter), pdf_margin, background printing, and the Markdown flavor and theme. Paper and margin fields apply to HTML and Markdown; Office and text files keep the converter’s native layout.',
  'builtin/encode-video@0.0.1':
    'Encode videos for web playback with an MP4 or WebM preset. Returns one encoded video per input. Defaults to the 720p MP4 preset with turbo encoding; width or height override that preset dimension. Output size depends on the source and preset.',
  'builtin/extract-text@0.0.1':
    'Extract text from images, PDFs and Office documents as plain text (default) or JSON. Returns one text result per input by default. Images use OCR; documents try embedded text before OCR, and Office files are converted to PDF first. Fields set text_method, the OCR provider (AWS or GCP), page_range, password and text_granularity, where page returns one result per page; those last three need native extraction. Unsupported formats are skipped.',
  'builtin/prepare-image@0.0.1':
    'Prepare images for a website: auto-orient, fit within 1600×1600 pixels without enlarging, encode as WebP at quality 75, strip metadata and keep transparency. Returns one image per input. Fields set width and height (w, h), format (f), quality (q), resize strategy (r), background color (bg) and metadata stripping (strip). JPEG output needs an opaque background.',
  'builtin/remove-background@0.0.1':
    'Remove the background from photos. Returns the foreground of each image as a transparent PNG. Fields set the provider (automatic by default); only provider transloadit also allows GIF or WebP output, or keeping the background instead of the foreground.',
  'builtin/transcribe@0.0.1':
    'Transcribe the speech in audio or video files. Returns one transcript per input as timestamped JSON (default), plain text, SRT or WebVTT. The automatic provider detects the spoken language; target_language (such as french) hints it, and source_language (default en-US) sets it for provider aws or gcp. Transcripts are never translated.',
  'builtin/video-covers@0.0.1':
    'Extract cover images from videos. Returns 8 JPEG frames per video by default, taken at regular intervals, or frames at exact offsets in seconds or percentages. Set smart to true to have AI scoring pick the strongest count frames from up to three candidates per frame, capped by smart_max_candidates but never fewer than count. Fields also set format (JPEG or PNG), width and height, which default to the video’s dimensions.',
}
