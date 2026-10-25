import type { InputFile, Transloadit } from '@transloadit/node'
import type { BuiltinTemplateCatalogItem } from '@transloadit/zod/v4/builtinTemplates'
import type { ValidateFunction } from 'ajv'

import {
  builtinTemplateCatalogItemSchema,
  mcpBuiltinInputUrlMaxCounts,
  mcpBuiltinTemplateManifest,
} from '@transloadit/zod/v4/builtinTemplates'
import { Ajv } from 'ajv'
import formatsPlugin from 'ajv-formats'
import { z } from 'zod'

import { isRecord } from './json.ts'

/**
 * What each approved Builtin does, condensed from API2's catalog descriptions. Tools list these
 * before a credential-scoped catalog read replaces them, and so does the static server card that
 * directories snapshot, so each must stand on its own and stay accurate to the API2 definition.
 */
const builtinSummaries: Readonly<Record<string, string>> = {
  'builtin/caption-video@0.0.1':
    'Transcribe the speech in a video and burn plain captions into the original video. Returns the captioned video and its SRT cues. Subtitle size, position, text and border colors are configurable; language fields describe the spoken language, never a translation.',
  'builtin/capture-webpage@0.0.1':
    'Capture a public HTTP(S) webpage or uploaded HTML as a PNG, JPEG or PDF. Defaults to a full-page PNG 1024 pixels wide; set fullpage to false for a fixed viewport. A URL takes precedence over uploaded HTML, and no custom headers, browser actions or credentials are sent.',
  'builtin/convert-to-pdf@0.0.1':
    'Convert Office documents, HTML, Markdown and plain text to PDF. Paper size, margins and background printing apply to HTML and Markdown; Office and text files keep the converter’s native layout.',
  'builtin/encode-video@0.0.1':
    'Encode videos for web playback with a web video preset. Defaults to 720p MP4 with turbo encoding; a supplied width or height overrides that preset dimension. Output size depends on the source and preset.',
  'builtin/extract-text@0.0.1':
    'Extract readable text or JSON from images, PDFs and Office documents. Images use OCR; documents try native text extraction before OCR by default. Passwords, page ranges and per-page grouping need native extraction, and unsupported formats are skipped.',
  'builtin/prepare-image@0.0.1':
    'Prepare images for a website: auto-orient, fit within 1600×1600, encode as WebP at quality 75, strip metadata and keep transparency. Size, format, quality, resize strategy, background and metadata stripping are configurable; JPEG output needs an opaque background.',
  'builtin/remove-background@0.0.1':
    'Remove the background from photos and return the foreground as a transparent PNG.',
  'builtin/transcribe@0.0.1':
    'Transcribe audio or video speech into timestamped JSON, plain text, SRT or WebVTT, with automatic provider selection. Language fields describe the spoken language, never a translation.',
  'builtin/video-covers@0.0.1':
    'Extract cover images from a video at regular intervals or exact offsets, optionally choosing strong frames with AI scoring. Image dimensions default to those of the video.',
}

/** Shortcut names and titles follow the reviewed manifest delivered by alphalib sync. */
export const builtinShortcuts = Object.keys(mcpBuiltinTemplateManifest).map((id) => {
  const slug = id.slice('builtin/'.length).split('@')[0] ?? ''
  const name: `transloadit_${string}` = `transloadit_${slug.replaceAll('-', '_')}`
  return {
    id,
    name,
    title: slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll('-', ' '),
    // A Builtin approved in a newer @transloadit/zod still lists, with neutral wording.
    summary: builtinSummaries[id] ?? `Run the ${slug} Builtin Template.`,
  }
})

/**
 * The outcome wording comes first, from the catalog or the static summary; the suffix describes
 * this tool's own inputs and outputs. Tool descriptions never refer to other tools: directories
 * such as Claude's require that, so cross-tool workflow lives in the server instructions and in
 * result next_steps.
 */
export const describeBuiltinShortcut = (description: string): string =>
  `${description} Pass the Builtin’s parameters under fields. Provide inputs as attachments (files shared in the chat), files (public URLs or small base64 payloads) or expected_uploads (files that exist only locally or in a sandbox; the result returns an upload_instructions curl command per file). Set wait_for_completion to wait up to a server budget (45 seconds by default). Returns the Assembly with its result files; running: true means it is still processing.`

type BuiltinFieldsContract = Pick<
  z.input<typeof builtinTemplateCatalogItemSchema>,
  'content' | 'fields_schema'
> & { id?: string }

/** Credential-scoped contracts for the approved workflow IDs. */
export type BuiltinCatalog = Map<string, BuiltinTemplateCatalogItem>

/** A caller-field validation failure whose message is safe to return through MCP. */
export class BuiltinFieldValidationError extends Error {}

const compileFieldsSchema = (
  schema: Record<string, unknown>,
): ValidateFunction<Record<string, unknown>> => {
  // Keep draft-07 refs, unions and conditionals intact. Compile the current small contract
  // per call so updates take effect without retaining credential-specific catalog snapshots.
  const validator = new Ajv({ strict: false, allErrors: true })
  // ajv-formats is CommonJS and exposes this default property in NodeNext's declarations.
  formatsPlugin.default(validator)
  return validator.compile<Record<string, unknown>>(schema)
}

const gatedFieldsSchema = (
  template: BuiltinFieldsContract,
): Record<string, unknown> | undefined => {
  if (!template.fields_schema) return undefined
  const schema = structuredClone(template.fields_schema)
  for (const [name, excluded] of Object.entries(
    mcpBuiltinTemplateManifest[template.id ?? ''] ?? {},
  )) {
    const properties = isRecord(schema.properties) ? schema.properties : {}
    const field = isRecord(properties[name]) ? properties[name] : {}
    schema.properties = {
      ...properties,
      [name]: {
        ...field,
        ...(Array.isArray(field.enum)
          ? { enum: field.enum.filter((value) => !excluded.includes(value)) }
          : {}),
        not: { enum: excluded },
      },
    }
  }
  return schema
}

/** Caller fields override content.fields; defaults satisfy required fields before execution. */
export const deriveShortcutFieldsSchema = (
  template: BuiltinFieldsContract,
): Record<string, unknown> | undefined => {
  const schema = gatedFieldsSchema(template)
  if (!schema) return undefined
  const defaults = template.content.fields ?? {}
  // These root constraints can change meaning when defaults are merged. A permissive caller
  // schema is safer than rewriting arbitrary branches; execution validates the full contract.
  if (
    Object.keys(defaults).length > 0 &&
    [
      '$ref',
      'allOf',
      'anyOf',
      'const',
      'dependencies',
      'enum',
      'if',
      'minProperties',
      'not',
      'oneOf',
    ].some((keyword) => Object.hasOwn(schema, keyword))
  )
    return undefined
  const derived = {
    ...schema,
    // The catalog schema is standalone. A local reference must still resolve within it when
    // nested under the MCP tool's fields property, rather than against the transport schema.
    $id:
      schema.$id ??
      `https://transloadit.com/.well-known/builtin-fields/${encodeURIComponent(template.id ?? 'anonymous')}`,
    ...(Array.isArray(schema.required)
      ? {
          required: schema.required.filter(
            // Do not silently repair malformed schemas; compilation rejects the contract.
            (name) => typeof name !== 'string' || !Object.hasOwn(defaults, name),
          ),
        }
      : {}),
    default: defaults,
  }
  try {
    compileFieldsSchema(derived)
    return derived
  } catch {
    // A malformed upstream contract must not invalidate discovery of the generic tools.
    return undefined
  }
}

/** Validate effective fields without coercion; conservative catalog constraints leave API2 authoritative. */
export const validateBuiltinFields = (
  template: BuiltinFieldsContract,
  fields: Record<string, unknown> = {},
): Record<string, unknown> => {
  const merged = { ...template.content.fields, ...fields }
  if (
    Object.entries(mcpBuiltinTemplateManifest[template.id ?? ''] ?? {}).some(([name, excluded]) =>
      excluded.some((value) => value === merged[name]),
    )
  ) {
    throw new BuiltinFieldValidationError(
      'This Builtin field value is temporarily unavailable. Choose another listed value.',
    )
  }
  const schema = gatedFieldsSchema(template)
  if (schema) {
    const validate = compileFieldsSchema(schema)
    if (!validate(merged)) {
      const errors = validate.errors ?? []
      // Ajv appends summaries after failed branches. A branch requirement may not apply to
      // the caller's intended variant, so prefer the enclosing combinator's diagnostic.
      const error =
        [...errors].reverse().find(({ keyword }) => ['anyOf', 'oneOf', 'if'].includes(keyword)) ??
        errors[0]
      const params: unknown = error?.params
      const field =
        error?.keyword === 'required' &&
        error.instancePath === '' &&
        isRecord(params) &&
        typeof params.missingProperty === 'string'
          ? params.missingProperty
          : (error?.instancePath.split('/')[1] ?? '').replaceAll('~1', '/').replaceAll('~0', '~')
      const location =
        isRecord(schema.properties) && Object.hasOwn(schema.properties, field)
          ? `fields.${field}`
          : 'fields'
      // Only catalog-declared field names and the validator keyword are safe to echo. Ajv's
      // messages, other params and unknown property names can contain sensitive caller data.
      throw new BuiltinFieldValidationError(
        `Invalid Builtin fields: ${location} violates ${error?.keyword ?? 'schema'}.`,
      )
    }
  }
  return merged
}

// API2's literal-URL rules for `input_url`; a URL it would refuse keeps today's download path.
const isLiteralHttpUrl = (value: string): boolean => {
  if ([...value].length > 4096 || /\s/u.test(value) || value.includes('${') || value.includes('|'))
    return false
  if (!URL.canParse(value)) return false
  const { protocol } = new URL(value)
  return protocol === 'http:' || protocol === 'https:'
}

/**
 * The URLs a shortcut call hands to API2 as `input_url`, so API2 imports them itself and nothing
 * is downloaded here. Only for eligible Builtins and calls whose every input is such a URL;
 * anything else (local, base64 or sandbox inputs, too many URLs, given file names)
 * returns undefined and keeps the download-and-upload path.
 */
export const selectBuiltinInputUrls = (
  templateId: string,
  inputs: readonly InputFile[],
  expectedUploads = 0,
): string[] | undefined => {
  const maxUrls = mcpBuiltinInputUrlMaxCounts[templateId]
  if (maxUrls === undefined || inputs.length === 0 || inputs.length > maxUrls) return undefined
  // expected_uploads counts every input; more than the URLs means sandbox uploads follow.
  if (expectedUploads > inputs.length) return undefined
  const urls: string[] = []
  for (const input of inputs) {
    if (input.kind !== 'url' || !isLiteralHttpUrl(input.url)) return undefined
    // API2 names an imported file after its URL, its redirects or Content-Disposition. A given
    // name (of a host attachment, say) may carry the extension processing depends on, and only an
    // upload keeps it.
    if (input.filename !== undefined) return undefined
    urls.push(input.url)
  }
  return urls
}

/** Read approved Builtins with a dedicated, retry-disabled client; callers never share catalogs. */
export const loadBuiltinShortcuts = async (
  client: Transloadit,
  templateId?: string,
): Promise<BuiltinCatalog> => {
  const templates: BuiltinCatalog = new Map()
  const approved = new Set(templateId ? [templateId] : builtinShortcuts.map(({ id }) => id))
  const pageSize = 100
  const deadline = performance.now() + 3000
  for (let page = 1; ; page += 1) {
    const remaining = Math.floor(deadline - performance.now())
    if (remaining <= 0) throw new Error('Builtin catalog discovery timed out.')
    // This client is used only for catalog reads. Bound the entire pagination loop below
    // MCP's request timeout, cancelling each stalled HTTP request through the SDK timeout.
    client.setDefaultTimeout(remaining)
    const response = await client.listTemplates({
      include_builtin: 'exclusively-all',
      page,
      pagesize: pageSize,
    })
    const items = z
      .object({ items: z.array(z.unknown()), count: z.number().optional() })
      .parse(response)
    for (const item of items.items) {
      const parsed = builtinTemplateCatalogItemSchema.safeParse(item)
      if (!parsed.success || !approved.has(parsed.data.id) || !parsed.data.fields_schema) continue
      templates.set(parsed.data.id, parsed.data)
    }
    if (
      // Stop once reviewed IDs are found; a fresh credential-scoped read avoids stale contracts.
      templates.size === approved.size ||
      items.items.length < pageSize ||
      (items.count !== undefined && page * pageSize >= items.count)
    )
      break
  }
  return templates
}

/** Apply one catalog to the SDK's tool list, retaining generic tools and outage recovery. */
export const applyBuiltinCatalog = (
  result: unknown,
  catalog: BuiltinCatalog | undefined,
): unknown => {
  if (!isRecord(result) || !Array.isArray(result.tools) || !catalog) return result
  const tools = result.tools.flatMap((tool) => {
    if (!isRecord(tool)) return [tool]
    const shortcut = builtinShortcuts.find(({ name }) => name === tool.name)
    if (!shortcut) return [tool]
    const template = catalog.get(shortcut.id)
    if (!template || !isRecord(tool.inputSchema) || !isRecord(tool.inputSchema.properties))
      return []
    const fields = deriveShortcutFieldsSchema(template)
    const required = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : []
    return [
      {
        ...tool,
        description: describeBuiltinShortcut(template.description ?? shortcut.summary),
        inputSchema: fields
          ? {
              ...tool.inputSchema,
              ...(Array.isArray(fields.required) && fields.required.length > 0
                ? { required: [...new Set([...required, 'fields'])] }
                : {}),
              properties: { ...tool.inputSchema.properties, fields },
            }
          : tool.inputSchema,
      },
    ]
  })
  return { ...result, tools }
}
