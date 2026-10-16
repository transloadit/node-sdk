import type { Transloadit } from '@transloadit/node'
import type { ValidateFunction } from 'ajv'

import { Ajv } from 'ajv'
import formatsPlugin from 'ajv-formats'
import { z } from 'zod'

import { isRecord } from './json.ts'
import { builtinShortcutNames } from './tool-metadata.ts'

/** Catalog contract; null and absent schemas both mean no declared validation schema. */
export const builtinTemplateSchema = z.object({
  id: z.string(),
  fields_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  content: z.object({ fields: z.record(z.string(), z.unknown()).default({}) }),
})

type BuiltinFieldsContract = {
  id?: string
  fields_schema?: Record<string, unknown> | null
  content: { fields?: Record<string, unknown> }
}

/** A caller-field validation failure whose message is safe to return through MCP. */
export class BuiltinFieldValidationError extends Error {}

/** Pin reviewed workflows, including plain captions, independently of future catalog versions. */
export const shortcutTemplateId = (name: (typeof builtinShortcutNames)[number]): string =>
  `builtin/${name.replace('transloadit_', '').replaceAll('_', '-')}@0.0.1`

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

// Remove this gate after the api2#9960 fix is deployed and its VP8/turbo output is verified.
const gatedFieldsSchema = (
  template: BuiltinFieldsContract,
): Record<string, unknown> | undefined => {
  const schema = template.fields_schema
  if (!schema) return undefined
  if (template.id !== 'builtin/encode-video@0.0.1') return structuredClone(schema)
  const properties = isRecord(schema.properties) ? schema.properties : {}
  const preset = isRecord(properties.preset) ? properties.preset : {}
  return {
    ...structuredClone(schema),
    properties: {
      ...structuredClone(properties),
      preset: {
        ...structuredClone(preset),
        ...(Array.isArray(preset.enum)
          ? { enum: preset.enum.filter((value) => value !== 'webm') }
          : {}),
        not: { const: 'webm' },
      },
    },
  }
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
  if (template.id === 'builtin/encode-video@0.0.1' && merged.preset === 'webm') {
    throw new BuiltinFieldValidationError(
      'The legacy ‘webm’ preset is temporarily unavailable. Choose another listed preset.',
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
  shortcut?: (typeof builtinShortcutNames)[number],
): Promise<Map<string, z.infer<typeof builtinTemplateSchema>>> => {
  const templates = new Map<string, z.infer<typeof builtinTemplateSchema>>()
  const approved = new Set((shortcut ? [shortcut] : builtinShortcutNames).map(shortcutTemplateId))
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
