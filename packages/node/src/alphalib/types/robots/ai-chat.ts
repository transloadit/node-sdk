import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  autoProviderDescription,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

// We duplicate coreMessageSchema (and its related types) from structuredAiVercel.ts here
// so that we do not need to distribute structuredAiVercel.ts to for instance
// the node-sdk, which does rely on this ai-chat file to determine
// support Robot parameters.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

// Define JSONValue schema for proper type matching with AI SDK
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
)

// Define provider options schema to match the AI SDK.
const providerMetadataSchema = z.record(z.record(jsonValueSchema)).optional()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function withCurrentProviderOptions(value: Record<string, unknown>): Record<string, unknown> {
  const { experimental_providerMetadata, ...rest } = value
  const providerOptions = value.providerOptions ?? experimental_providerMetadata
  return providerOptions === undefined ? rest : { ...rest, providerOptions }
}

function legacyToolOutput(
  result: unknown,
  isError: boolean,
  experimentalContent: unknown,
): unknown {
  if (!isError && Array.isArray(experimentalContent)) {
    const content = experimentalContent.flatMap((part): unknown[] => {
      if (!isRecord(part)) {
        return []
      }
      if (part.type === 'text' && typeof part.text === 'string') {
        return [{ type: 'text', text: part.text }]
      }
      if (part.type === 'image' && typeof part.data === 'string') {
        return [
          {
            type: 'image-data',
            data: part.data,
            mediaType: typeof part.mimeType === 'string' ? part.mimeType : 'image',
          },
        ]
      }
      if (
        part.type === 'media' &&
        typeof part.data === 'string' &&
        typeof part.mediaType === 'string'
      ) {
        return [{ type: 'file-data', data: part.data, mediaType: part.mediaType }]
      }
      return []
    })
    if (content.length === experimentalContent.length) {
      return { type: 'content', value: content }
    }
  }

  let parsed: ReturnType<typeof jsonValueSchema.safeParse> | undefined
  try {
    // Zod's recursive JSON schema overflows before returning a failed parse for circular values.
    parsed = jsonValueSchema.safeParse(result)
  } catch {
    parsed = undefined
  }
  if (parsed?.success) {
    return { type: isError ? 'error-json' : 'json', value: parsed.data }
  }
  return { type: isError ? 'error-text' : 'text', value: stringifyLegacyToolResult(result) }
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
            if (
              isRecord(part) &&
              part.type === 'media' &&
              typeof part.data === 'string' &&
              typeof part.mediaType === 'string'
            ) {
              return { type: 'file-data', data: part.data, mediaType: part.mediaType }
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

function normalizeMessage(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }
  const normalized = withCurrentProviderOptions(value)
  return Array.isArray(normalized.content)
    ? { ...normalized, content: normalized.content.map(normalizeMessagePart) }
    : normalized
}

const inlineDataSchema = z.union([z.string(), z.instanceof(Uint8Array), z.instanceof(ArrayBuffer)])
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
const toolCallPartBaseSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  providerOptions: providerMetadataSchema,
  providerExecuted: z.boolean().optional(),
})
type ToolCallPart = Omit<z.infer<typeof toolCallPartBaseSchema>, 'input'> & { input: unknown }
const toolCallPartSchema = toolCallPartBaseSchema.transform(
  (part): ToolCallPart => ({ ...part, input: part.input }),
)
const toolOutputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string(), providerOptions: providerMetadataSchema }),
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
const coreMessageOutputSchema = z.discriminatedUnion('role', [
  coreSystemMessageSchema,
  coreUserMessageSchema,
  coreAssistantMessageSchema,
  coreToolMessageSchema,
])
const coreMessageSchema = z.preprocess(normalizeMessage, coreMessageOutputSchema)

type ProviderMetadata = NonNullable<z.output<typeof providerMetadataSchema>>
type CompatibleProviderOptions<Part extends { providerOptions?: ProviderMetadata }> = Omit<
  Part,
  'providerOptions'
> & {
  providerOptions?: ProviderMetadata
  experimental_providerMetadata?: ProviderMetadata
}
type MessageProviderOptions = {
  providerOptions?: ProviderMetadata
  experimental_providerMetadata?: ProviderMetadata
}

type TextPartInput = CompatibleProviderOptions<z.output<typeof textPartSchema>>
type ImagePartInput = CompatibleProviderOptions<z.output<typeof imagePartSchema>>
type LegacyImagePartInput = CompatibleProviderOptions<
  Omit<z.output<typeof imagePartSchema>, 'mediaType'> & { mimeType?: string }
>
type FilePartInput = CompatibleProviderOptions<z.output<typeof filePartSchema>>
type CustomPartInput = CompatibleProviderOptions<z.output<typeof customPartSchema>>
type ReasoningPartInput = CompatibleProviderOptions<z.output<typeof reasoningPartSchema>>
type ReasoningFilePartInput = CompatibleProviderOptions<z.output<typeof reasoningFilePartSchema>>
type ToolCallPartInput = CompatibleProviderOptions<z.output<typeof toolCallPartSchema>>
type LegacyToolCallPartInput = Omit<ToolCallPartInput, 'input'> & { args: unknown }
type ToolResultPartInput = CompatibleProviderOptions<z.output<typeof toolResultPartSchema>>

type LegacyTextToolContentPart = { type: 'text'; text: string }
type LegacyImageToolContentPart = { type: 'image'; data: string; mimeType?: string }
type LegacyMediaToolContentPart = { type: 'media'; data: string; mediaType: string }
type LegacyToolContentPart =
  | LegacyTextToolContentPart
  | LegacyImageToolContentPart
  | LegacyMediaToolContentPart
type CurrentToolContentPart = Extract<
  z.output<typeof toolOutputSchema>,
  { type: 'content' }
>['value'][number]
type LegacyToolResultPartInput = {
  type: 'tool-result'
  toolCallId: string
  toolName: string
  output?:
    | Exclude<z.output<typeof toolOutputSchema>, { type: 'content' }>
    | { type: 'content'; value: Array<CurrentToolContentPart | LegacyToolContentPart> }
  result?: unknown
  isError?: boolean
  experimental_content?: LegacyToolContentPart[]
} & MessageProviderOptions
type LegacyMediaMessagePartInput = LegacyMediaToolContentPart & MessageProviderOptions

type CoreSystemMessageInput = {
  role: 'system'
  content: string
} & MessageProviderOptions
type CoreUserMessageInput = {
  role: 'user'
  content:
    | string
    | Array<
        | TextPartInput
        | ImagePartInput
        | LegacyImagePartInput
        | FilePartInput
        | LegacyMediaMessagePartInput
      >
} & MessageProviderOptions
type CoreAssistantMessageInput = {
  role: 'assistant'
  content:
    | string
    | Array<
        | TextPartInput
        | CustomPartInput
        | FilePartInput
        | ReasoningPartInput
        | ReasoningFilePartInput
        | ToolCallPartInput
        | LegacyToolCallPartInput
        | ToolResultPartInput
        | LegacyToolResultPartInput
        | z.output<typeof toolApprovalRequestSchema>
      >
} & MessageProviderOptions
type CoreToolMessageInput = {
  role: 'tool'
  content: Array<
    ToolResultPartInput | LegacyToolResultPartInput | z.output<typeof toolApprovalResponseSchema>
  >
} & MessageProviderOptions

export type CoreMessageInput =
  | z.output<typeof coreMessageOutputSchema>
  | CoreSystemMessageInput
  | CoreUserMessageInput
  | CoreAssistantMessageInput
  | CoreToolMessageInput

type WithTypedMessages<Instructions extends { messages: unknown }> = Omit<
  Instructions,
  'messages'
> & { messages: string | CoreMessageInput[] }

export const meta: RobotMetaInput = {
  name: 'AiChatRobot',
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      reply: {
        robot: '/ai/chat',
        model: 'auto',
        messages:
          'Summarize this in one sentence: Transloadit handles uploads and media processing.',
      },
    },
  },
  example_code_description: 'Generate a concise AI response from a text prompt:',
  minimum_charge: 0,
  output_factor: 0.6,
  purpose_sentence: 'generates AI chat responses from prompts',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate AI chat responses',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Generate AI chat responses',
  typical_file_size_mb: 0.01,
  typical_file_type: 'document',
  priceFactor: 1,
  queueSlotCount: 10,
  // Is this a sensible minimum charge? What if the customer supplies their own keys? Is it low enough for these cases?
  minimumChargeUsd: 0.06,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'alpha',
}

/**
 * Transloadit's supported /ai/chat models and their input capabilities.
 * This is intentionally not a complete vendor catalog: add models only after runtime behavior,
 * pricing, and file handling have been reviewed.
 * Key format: 'vendor/model'
 */
export const MODEL_CAPABILITIES: Record<string, { pdf: boolean; image: boolean }> = {
  'anthropic/claude-sonnet-4-6': { pdf: true, image: true },
  'anthropic/claude-4-sonnet-20250514': { pdf: true, image: true },
  'anthropic/claude-sonnet-4-20250514': { pdf: true, image: true },
  'anthropic/claude-opus-4-8': { pdf: true, image: true },
  'anthropic/claude-opus-5': { pdf: true, image: true },
  'anthropic/claude-4-opus-20250514': { pdf: true, image: true },
  'anthropic/claude-opus-4-20250514': { pdf: true, image: true },
  'anthropic/claude-sonnet-4-5': { pdf: true, image: true },
  'anthropic/claude-opus-4-5': { pdf: true, image: true },
  'anthropic/claude-opus-4-6': { pdf: true, image: true },
  'anthropic/claude-opus-4-7': { pdf: true, image: true },
  'anthropic/claude-fable-5': { pdf: true, image: true },
  'anthropic/claude-sonnet-5': { pdf: true, image: true },
  'openai/gpt-4.1-2025-04-14': { pdf: false, image: true },
  'openai/chatgpt-4o-latest': { pdf: false, image: true },
  'openai/o3-2025-04-16': { pdf: false, image: true },
  'openai/gpt-audio': { pdf: false, image: false },
  'openai/gpt-audio-2025-08-28': { pdf: false, image: false },
  'openai/gpt-4o-audio-preview': { pdf: false, image: false },
  'openai/gpt-5.2': { pdf: false, image: true },
  'openai/gpt-5.2-2025-12-11': { pdf: false, image: true },
  'openai/gpt-5.2-chat-latest': { pdf: false, image: true },
  'openai/gpt-5.2-pro': { pdf: false, image: true },
  'openai/gpt-5.5': { pdf: false, image: true },
  'openai/gpt-5.6-sol': { pdf: false, image: true },
  'openai/gpt-5.4': { pdf: false, image: true },
  'openai/gpt-5.4-mini': { pdf: false, image: true },
  'openai/gpt-5.4-nano': { pdf: false, image: true },
  'google/gemini-2.5-pro': { pdf: true, image: true },
  'moonshot/kimi-k2': { pdf: false, image: false },
}

// Default model for /ai/chat when `model: "auto"` (or unset).
// 2026-07-09: default is GPT-5.6 Sol (intentional; aligns with our current recommended OpenAI
// flagship model). Keep this aligned with MODEL_CAPABILITIES.
export const AI_CHAT_DEFAULT_MODEL = 'openai/gpt-5.6-sol' satisfies keyof typeof MODEL_CAPABILITIES

const supportedModelsList = Object.keys(MODEL_CAPABILITIES)

export const vendorModelSchema = z
  .string()
  .regex(/^[a-z]+\/[a-z0-9.-]+$/, 'Must be in format "vendor/model"')
  .refine((val) => Object.hasOwn(MODEL_CAPABILITIES, val), {
    message: `Invalid vendor/model combination. Supported: ${supportedModelsList.join(', ')}`,
  })

export type VendorModel = z.infer<typeof vendorModelSchema>

export const robotAiChatInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/ai/chat'),
    // NOTE: model:"auto" is resolved server-side to AI_CHAT_DEFAULT_MODEL for now.
    model: z
      .union([vendorModelSchema, z.literal('auto')])
      .default('auto')
      .describe(
        'The model to use. Transloadit can pick the best model for the job if you set this to "auto".',
      ),
    format: z.enum(['json', 'text', 'meta']).default('json'),
    return_messages: z.enum(['all', 'last']).default('last'),
    schema: z.string().optional().describe('The JSON Schema that the LLM should output'),
    messages: z
      .union([z.string(), z.array(coreMessageSchema)])
      .describe('The prompt, or message history to send to the LLM.'),
    system_message: z
      .string()
      .optional()
      .describe(
        'Set the system/developer prompt, if the model allows it. If this prompt contains literal documentation or code examples with `${...}` syntax, set `interpolate.system_message` to `false`.',
      ),
    reasoning_effort: z
      .enum(['xhigh', 'high', 'medium', 'low'])
      .optional()
      .describe(
        'Controls how much effort the model spends on reasoning. Higher values produce more thorough responses but cost more tokens. Applies to models that support extended thinking (OpenAI o-series, GPT-5.x, Anthropic Claude with thinking). If omitted, the model default is used.',
      ),
    credentials: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Names of template credentials to make available to the robot. When using your own AI provider keys, Transloadit charges a 30% markup (minimum $0.0005 per request).',
      ),
    test_credentials: z
      .boolean()
      .optional()
      .describe(
        'Use Transloadit-provided credentials for testing. Usage is billed at provider cost plus a 30% markup (minimum $0.0005 per request).',
      ),
    mcp_servers: z
      .array(
        z.object({
          type: z.enum(['sse', 'http']),
          url: z.string(),
          headers: z.record(z.string()).optional(),
          auth: z.enum(['transloadit']).optional(),
          allowed_tools: z
            .array(z.string())
            .optional()
            .describe(
              'Optional allowlist of tool names to expose from this MCP server. If omitted, all tools exposed by the server are available to the model.',
            ),
        }),
      )
      .optional()
      .describe(
        'The MCP servers to use for tool calling. You can use any MCP server reachable from your environment. Use `headers` to pass server-specific auth (for example `Authorization: Bearer <token>`). For Transloadit\'s MCP server: Bearer tokens minted via `/token` satisfy Signature Authentication (signature checks apply only to key/secret requests). `auth: "transloadit"` is reserved for API2-managed auth to Transloadit-hosted MCP servers.',
      ),
  })
  .strict()

export const robotAiChatInstructionsWithHiddenFieldsSchema = robotAiChatInstructionsSchema.extend({
  result: z.union([z.literal('debug'), robotAiChatInstructionsSchema.shape.result]),
  provider: z
    .string()
    .default('auto')
    .describe(
      `${autoProviderDescription} This is a hidden placeholder for future model routing flexibility.`,
    ),
  // These are listed here because we don't have these properties in the public documentation.
  // They should set these keys using template credentials.
  openai_api_key: z.string().optional().describe('The API key to use for the OpenAI API.'),
  anthropic_api_key: z.string().optional().describe('The API key to use for the Anthropic API.'),
  deepseek_api_key: z.string().optional().describe('The API key to use for the DeepSeek API.'),
  google_generative_ai_api_key: z
    .string()
    .optional()
    .describe('The API key to use for the Google Generative AI API.'),
  xai_api_key: z.string().optional().describe('The API key to use for the xAI API.'),
})

export type RobotAiChatInstructions = z.infer<typeof robotAiChatInstructionsSchema>
export type RobotAiChatInstructionsInput = WithTypedMessages<
  z.input<typeof robotAiChatInstructionsSchema>
>

export type RobotAiChatInstructionsWithHiddenFields = z.infer<
  typeof robotAiChatInstructionsWithHiddenFieldsSchema
>

export type RobotAiChatInstructionsWithHiddenFieldsInput = WithTypedMessages<
  z.input<typeof robotAiChatInstructionsWithHiddenFieldsSchema>
>

export const interpolatableRobotAiChatInstructionsSchema = interpolateRobot(
  robotAiChatInstructionsSchema,
)
export type InterpolatableRobotAiChatInstructions = z.infer<
  typeof interpolatableRobotAiChatInstructionsSchema
>
export type InterpolatableRobotAiChatInstructionsInput = WithTypedMessages<
  z.input<typeof interpolatableRobotAiChatInstructionsSchema>
>

export const interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAiChatInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAiChatInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput = WithTypedMessages<
  z.input<typeof interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema>
>
