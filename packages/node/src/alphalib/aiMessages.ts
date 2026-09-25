import { z } from 'zod'

import { isRecord } from './object.ts'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => jsonValueUnionSchema)
const jsonValueUnionSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(jsonValueSchema),
])

// Define provider options schema to match the AI SDK.
const providerMetadataSchema = z.record(z.record(jsonValueSchema)).optional()

interface LegacyJsonFrame {
  source: object
  copy: Record<string, unknown> | unknown[]
  entries: Iterator<[string | number, unknown]>
  depth: number
  values: number
}

function* legacyRecordEntries(value: Record<string, unknown>): Generator<[string, unknown]> {
  // Zod records also validate inherited enumerable properties, unlike JSON.stringify.
  for (const key in value) {
    yield [key, value[key]]
  }
}

function legacyJsonFrame(value: unknown): LegacyJsonFrame | undefined {
  if (Array.isArray(value)) {
    // Zod arrays consume the iterator, ignoring non-element properties.
    const copy: unknown[] = [...value]
    return { source: value, copy, entries: copy.entries(), depth: 1, values: 1 }
  }
  if (isRecord(value) && z.getParsedType(value) === 'object') {
    return { source: value, copy: {}, entries: legacyRecordEntries(value), depth: 1, values: 1 }
  }
  // Preserve non-JSON objects (Date, Map, promises, etc.) for Zod to reject, not coerce.
  return undefined
}

function snapshotLegacyJson(
  result: unknown,
  limits?: { depth: number; values: number },
): { value: unknown } | undefined {
  const root = legacyJsonFrame(result)
  if (root === undefined) {
    return { value: result }
  }

  const ancestors = new WeakSet([root.source])
  const snapshots = new WeakMap<object, LegacyJsonFrame>([[root.source, root]])
  const stack = [root]
  // An iterative snapshot avoids both recursive cycle checking and reading getters twice
  // (once in a preflight walk, then again with potentially different values inside Zod).
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (
      limits !== undefined &&
      (stack.length + frame.depth - 1 > limits.depth || frame.values > limits.values)
    ) {
      return undefined
    }
    const entry = frame.entries.next()
    if (entry.done) {
      ancestors.delete(frame.source)
      stack.pop()
      const parent = stack[stack.length - 1]
      if (parent !== undefined) {
        parent.depth = Math.max(parent.depth, frame.depth + 1)
        parent.values += frame.values
      }
      continue
    }
    const [key, value] = entry.value
    if (typeof value === 'object' && value !== null && ancestors.has(value)) {
      return undefined
    }
    // Preserve graph sharing so a small DAG cannot expand exponentially before Zod runs.
    // A shared object's getters deliberately contribute one stable snapshot, not one per path.
    const existing = typeof value === 'object' && value !== null ? snapshots.get(value) : undefined
    const child = existing === undefined ? legacyJsonFrame(value) : undefined
    // Defining a data property preserves a literal __proto__ key for Zod's own handling.
    Object.defineProperty(frame.copy, key, {
      configurable: true,
      enumerable: true,
      value: existing?.copy ?? child?.copy ?? value,
      writable: true,
    })
    if (child !== undefined) {
      snapshots.set(child.source, child)
      ancestors.add(child.source)
      stack.push(child)
    } else {
      frame.depth = Math.max(frame.depth, (existing?.depth ?? 0) + 1)
      frame.values += existing?.values ?? 1
    }
  }
  return { value: root.copy }
}

/** Normalizes legacy JSON/text tool results at both the runtime and portable Robot boundaries. */
function legacyJsonToolOutput(result: unknown, isError: boolean): unknown {
  try {
    const snapshot = snapshotLegacyJson(result)
    const parsed = snapshot === undefined ? undefined : jsonValueSchema.safeParse(snapshot.value)
    if (parsed?.success) {
      return { type: isError ? 'error-json' : 'json', value: parsed.data }
    }
  } catch {
    // Accessors can throw; deeply nested acyclic input can still exceed Zod's stack.
    // Keep the existing text fallback without using a stack overflow to detect cycles.
  }
  return { type: isError ? 'error-text' : 'text', value: stringifyLegacyToolResult(result) }
}

function withCurrentProviderOptions(value: Record<string, unknown>): Record<string, unknown> {
  const { experimental_providerMetadata, providerOptions: currentProviderOptions, ...rest } = value
  const providerOptions = currentProviderOptions ?? experimental_providerMetadata
  return providerOptions === undefined ? rest : { ...rest, providerOptions }
}

function legacyToolContentProviderOptions(
  value: unknown,
): { providerOptions?: z.output<typeof providerMetadataSchema> } | undefined {
  if (value === undefined) return {}
  try {
    // Bound Zod's recursive work, including repeated DAG paths, before validating metadata.
    // Return the validated snapshot so changing getters cannot reintroduce cycles afterward.
    const snapshot = snapshotLegacyJson(value, { depth: 128, values: 10_000 })
    if (snapshot === undefined) return undefined
    const parsed = providerMetadataSchema.safeParse(snapshot.value)
    return parsed.success ? { providerOptions: parsed.data } : undefined
  } catch {
    // Unreadable metadata follows the same legacy result fallback as invalid content.
    return undefined
  }
}

function normalizeLegacyToolContentPart(part: unknown): unknown | undefined {
  if (!isRecord(part)) return undefined

  const normalized = withCurrentProviderOptions(part)
  const providerOptions = legacyToolContentProviderOptions(normalized.providerOptions)
  if (providerOptions === undefined) return undefined
  if (normalized.type === 'text' && typeof normalized.text === 'string') {
    return { type: 'text', text: normalized.text, ...providerOptions }
  }
  if (normalized.type === 'image' && typeof normalized.data === 'string') {
    return {
      type: 'image-data',
      data: normalized.data,
      mediaType: typeof normalized.mimeType === 'string' ? normalized.mimeType : 'image',
      ...providerOptions,
    }
  }
  if (
    normalized.type === 'media' &&
    typeof normalized.data === 'string' &&
    typeof normalized.mediaType === 'string'
  ) {
    return {
      type: 'file-data',
      data: normalized.data,
      mediaType: normalized.mediaType,
      ...providerOptions,
    }
  }
  return undefined
}

function legacyToolOutput(
  result: unknown,
  isError: boolean,
  experimentalContent: unknown,
): unknown {
  if (!isError && Array.isArray(experimentalContent)) {
    const content = experimentalContent.flatMap((part): unknown[] => {
      const normalized = normalizeLegacyToolContentPart(part)
      return normalized === undefined ? [] : [normalized]
    })
    if (content.length === experimentalContent.length) {
      return { type: 'content', value: content }
    }
  }

  return legacyJsonToolOutput(result, isError)
}

function stringifyLegacyToolResult(result: unknown): string {
  try {
    const serialized = JSON.stringify(result)
    if (serialized !== undefined) {
      return serialized
    }
  } catch {
    // Fall back to the platform string representation for circular or unsupported values.
  }
  return String(result)
}

function normalizeMessagePart(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const normalized = withCurrentProviderOptions(value)
  if (normalized.type === 'image' && !('mediaType' in normalized) && 'mimeType' in normalized) {
    const { mimeType, ...rest } = normalized
    return { ...rest, mediaType: mimeType }
  }
  if (
    normalized.type === 'media' &&
    typeof normalized.data === 'string' &&
    typeof normalized.mediaType === 'string'
  ) {
    const { data, mediaType, type: _type, ...rest } = normalized
    return { ...rest, type: 'file', data: { type: 'data', data }, mediaType }
  }
  if (normalized.type === 'tool-call' && !('input' in normalized) && 'args' in normalized) {
    const { args, ...rest } = normalized
    return { ...rest, input: args }
  }
  if (normalized.type === 'tool-result' && 'output' in normalized) {
    const output = normalized.output
    if (isRecord(output) && output.type === 'content' && Array.isArray(output.value)) {
      return {
        ...normalized,
        output: {
          ...output,
          value: output.value.map((part) => {
            const converted = normalizeLegacyToolContentPart(part)
            if (converted !== undefined) return converted
            // Explicit output has no result fallback. Reject invalid legacy-shaped content;
            // returning it unchanged would strip its metadata alias or recurse into cycles.
            // Every content variant requires a literal type, so this untagged sentinel rejects.
            if (
              isRecord(part) &&
              (part.type === 'text' || part.type === 'image' || part.type === 'media')
            ) {
              return z.NEVER
            }
            return part
          }),
        },
      }
    }
  }
  if (normalized.type === 'tool-result' && !('output' in normalized)) {
    const { experimental_content: experimentalContent, isError, result, ...rest } = normalized
    return {
      ...rest,
      output: legacyToolOutput(result, isError === true, experimentalContent),
    }
  }
  return normalized
}

/** Accepts legacy provider metadata and message parts before validating the current message shape. */
export function normalizeCoreMessage(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }
  const normalized = withCurrentProviderOptions(value)
  return Array.isArray(normalized.content)
    ? { ...normalized, content: normalized.content.map(normalizeMessagePart) }
    : normalized
}

export const toolCallPartBaseSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  providerOptions: providerMetadataSchema,
  providerExecuted: z.boolean().optional(),
})

/**
 * Shares message compatibility without pulling server AI clients or Node globals into the SDK.
 * Inference retains each caller's binary union and tool-call output through both Zod versions.
 */
export function createCoreMessageSchemas<
  Data extends z.ZodType,
  ToolCall extends z.ZodType,
  Json extends z.ZodType,
  ProviderOptions extends z.ZodType,
>(
  inlineDataSchema: Data,
  toolCallPartSchema: ToolCall,
  jsonValueSchema: Json,
  providerMetadataSchema: ProviderOptions,
) {
  const providerReferenceSchema = z.record(z.string(), z.string())
  const taggedFileDataSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('data'), data: inlineDataSchema }),
    z.object({ type: z.literal('url'), url: z.instanceof(URL) }),
    z.object({ type: z.literal('reference'), reference: providerReferenceSchema }),
    z.object({ type: z.literal('text'), text: z.string() }),
  ])
  const taggedReasoningFileDataSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('data'), data: inlineDataSchema }),
    z.object({ type: z.literal('url'), url: z.instanceof(URL) }),
  ])

  const textPartSchema = z.object({
    type: z.literal('text'),
    text: z.string(),
    providerOptions: providerMetadataSchema,
  })
  const imagePartSchema = z.object({
    type: z.literal('image'),
    image: z.union([inlineDataSchema, z.instanceof(URL), providerReferenceSchema]),
    mediaType: z.string().optional(),
    providerOptions: providerMetadataSchema,
  })
  const filePartSchema = z.object({
    type: z.literal('file'),
    data: z.union([
      taggedFileDataSchema,
      inlineDataSchema,
      z.instanceof(URL),
      providerReferenceSchema,
    ]),
    filename: z.string().optional(),
    mediaType: z.string(),
    providerOptions: providerMetadataSchema,
  })
  const reasoningPartSchema = z.object({
    type: z.literal('reasoning'),
    text: z.string(),
    providerOptions: providerMetadataSchema,
  })
  function isCustomKind(value: string): value is `${string}.${string}` {
    return value.includes('.')
  }
  const customPartSchema = z.object({
    type: z.literal('custom'),
    kind: z.string().refine(isCustomKind),
    providerOptions: providerMetadataSchema,
  })
  const reasoningFilePartSchema = z.object({
    type: z.literal('reasoning-file'),
    data: z.union([taggedReasoningFileDataSchema, inlineDataSchema, z.instanceof(URL)]),
    mediaType: z.string(),
    providerOptions: providerMetadataSchema,
  })
  const toolOutputSchema = z.discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      value: z.string(),
      providerOptions: providerMetadataSchema,
    }),
    z.object({
      type: z.literal('json'),
      value: jsonValueSchema,
      providerOptions: providerMetadataSchema,
    }),
    z.object({
      type: z.literal('execution-denied'),
      reason: z.string().optional(),
      providerOptions: providerMetadataSchema,
    }),
    z.object({
      type: z.literal('error-text'),
      value: z.string(),
      providerOptions: providerMetadataSchema,
    }),
    z.object({
      type: z.literal('error-json'),
      value: jsonValueSchema,
      providerOptions: providerMetadataSchema,
    }),
    z.object({
      type: z.literal('content'),
      value: z.array(
        z.union([
          z.object({
            type: z.literal('text'),
            text: z.string(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('file'),
            data: taggedFileDataSchema,
            mediaType: z.string(),
            filename: z.string().optional(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('file-data'),
            data: z.string(),
            mediaType: z.string(),
            filename: z.string().optional(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('file-url'),
            url: z.string(),
            mediaType: z.string().optional(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('file-id'),
            fileId: z.union([z.string(), providerReferenceSchema]),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('file-reference'),
            providerReference: providerReferenceSchema,
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('image-data'),
            data: z.string(),
            mediaType: z.string(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('image-url'),
            url: z.string(),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('image-file-id'),
            fileId: z.union([z.string(), providerReferenceSchema]),
            providerOptions: providerMetadataSchema,
          }),
          z.object({
            type: z.literal('image-file-reference'),
            providerReference: providerReferenceSchema,
            providerOptions: providerMetadataSchema,
          }),
          z.object({ type: z.literal('custom'), providerOptions: providerMetadataSchema }),
        ]),
      ),
    }),
  ])
  const toolResultPartSchema = z.object({
    type: z.literal('tool-result'),
    toolCallId: z.string(),
    toolName: z.string(),
    output: toolOutputSchema,
    providerOptions: providerMetadataSchema,
  })
  const toolApprovalRequestSchema = z.object({
    type: z.literal('tool-approval-request'),
    approvalId: z.string(),
    toolCallId: z.string(),
    isAutomatic: z.boolean().optional(),
    signature: z.string().optional(),
  })
  const toolApprovalResponseSchema = z.object({
    type: z.literal('tool-approval-response'),
    approvalId: z.string(),
    approved: z.boolean(),
    reason: z.string().optional(),
    providerExecuted: z.boolean().optional(),
  })
  const coreSystemMessageSchema = z.object({
    role: z.literal('system'),
    content: z.string(),
    providerOptions: providerMetadataSchema,
  })
  const coreUserMessageSchema = z.object({
    role: z.literal('user'),
    content: z.union([
      z.string(),
      z.array(z.union([textPartSchema, imagePartSchema, filePartSchema])),
    ]),
    providerOptions: providerMetadataSchema,
  })
  const coreAssistantMessageSchema = z.object({
    role: z.literal('assistant'),
    content: z.union([
      z.string(),
      z.array(
        z.union([
          textPartSchema,
          customPartSchema,
          filePartSchema,
          reasoningPartSchema,
          reasoningFilePartSchema,
          toolCallPartSchema,
          toolResultPartSchema,
          toolApprovalRequestSchema,
        ]),
      ),
    ]),
    providerOptions: providerMetadataSchema,
  })
  const coreToolMessageSchema = z.object({
    role: z.literal('tool'),
    content: z.array(z.union([toolResultPartSchema, toolApprovalResponseSchema])),
    providerOptions: providerMetadataSchema,
  })
  const outputSchema = z.discriminatedUnion('role', [
    coreSystemMessageSchema,
    coreUserMessageSchema,
    coreAssistantMessageSchema,
    coreToolMessageSchema,
  ])

  return {
    outputSchema,
    coreSystemMessageSchema,
    coreUserMessageSchema,
    coreAssistantMessageSchema,
    coreToolMessageSchema,
    textPartSchema,
    imagePartSchema,
    filePartSchema,
    customPartSchema,
    reasoningPartSchema,
    reasoningFilePartSchema,
    toolCallPartSchema,
    toolResultPartSchema,
    toolApprovalRequestSchema,
    toolApprovalResponseSchema,
    toolOutputSchema,
  }
}

/** Build the validated current message shape for runtime callers. */
export function createCoreMessageOutputSchema<
  Data extends z.ZodType,
  ToolCall extends z.ZodType,
  Json extends z.ZodType,
  ProviderOptions extends z.ZodType,
>(
  inlineDataSchema: Data,
  toolCallPartSchema: ToolCall,
  jsonValueSchema: Json,
  providerMetadataSchema: ProviderOptions,
) {
  return createCoreMessageSchemas(
    inlineDataSchema,
    toolCallPartSchema,
    jsonValueSchema,
    providerMetadataSchema,
  ).outputSchema
}
