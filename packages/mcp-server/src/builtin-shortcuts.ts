import type { Transloadit } from '@transloadit/node'
import type { ValidateFunction } from 'ajv'

import { Ajv } from 'ajv'
import formatsPlugin from 'ajv-formats'
import { z } from 'zod'

import { isRecord } from './json.ts'

// Channel approvals are not published by alphalib yet (api2#10024). Keep only reviewed
// IDs and deployment gates here; names/titles derive below, descriptions/contracts from API2.
const builtinOverrides: Record<string, Record<string, string[]>> = {
  'builtin/caption-video@0.0.1': {},
  'builtin/capture-webpage@0.0.1': {},
  'builtin/convert-to-pdf@0.0.1': {},
  // Remove after api2#9960 is deployed and its VP8/turbo output is verified.
  'builtin/encode-video@0.0.1': { preset: ['webm'] },
  'builtin/extract-text@0.0.1': {},
  'builtin/prepare-image@0.0.1': {},
  'builtin/remove-background@0.0.1': {},
  'builtin/transcribe@0.0.1': {},
  'builtin/video-covers@0.0.1': {},
}

/** Single shortcut registry; replace the reviewed IDs with the shared manifest once published. */
export const builtinShortcuts = Object.keys(builtinOverrides).map((id) => {
  const slug = id.slice('builtin/'.length).split('@')[0] ?? ''
  const name: `transloadit_${string}` = `transloadit_${slug.replaceAll('-', '_')}`
  return { id, name, title: slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll('-', ' ') }
})

/** Catalog descriptions supply the outcome wording; this suffix describes the MCP adapter. */
export const describeBuiltinShortcut = (description = 'Run a reviewed Builtin Template.'): string =>
  `${description} Supply parameters under fields. Accepts the same files, attachments, expected_uploads and wait options as transloadit_create_assembly.`

/** Standalone catalog JSON Schema, or null for a legacy Builtin without a declared contract. */
export const catalogFieldsSchema = z.record(z.string(), z.unknown()).nullable()

/** Catalog contract; null and absent schemas both mean no declared validation schema. */
export const builtinTemplateSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  fields_schema: catalogFieldsSchema.optional(),
  content: z.object({ fields: z.record(z.string(), z.unknown()).default({}) }),
})

type BuiltinFieldsContract = Pick<
  z.input<typeof builtinTemplateSchema>,
  'content' | 'fields_schema'
> & { id?: string }

/** Credential-scoped contracts for the approved workflow IDs. */
export type BuiltinCatalog = Map<string, z.infer<typeof builtinTemplateSchema>>

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
  for (const [name, excluded] of Object.entries(builtinOverrides[template.id ?? ''] ?? {})) {
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
    Object.entries(builtinOverrides[template.id ?? ''] ?? {}).some(([name, excluded]) =>
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
      const parsed = builtinTemplateSchema.safeParse(item)
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
        description: describeBuiltinShortcut(template.description),
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
