import { z } from 'zod'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

// We duplicate coreMessageSchema (and its related types) from structuredAiVercel.ts here
// so that we do not need to distribute structuredAiVercel.ts to for instance
// the node-sdk, which does rely on this ai-chat file to determine
// support Robot parameters.

// Define JSONValue schema for proper type matching with AI SDK
const jsonValueSchema: z.ZodType = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
)

// Define provider metadata schema to match the AI SDK v5
const providerMetadataSchema = z.record(z.record(jsonValueSchema)).optional()

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  experimental_providerMetadata: providerMetadataSchema,
})
const imagePartSchema = z.object({
  type: z.literal('image'),
  image: z.union([
    z.string(),
    z.instanceof(Uint8Array),
    z.instanceof(ArrayBuffer),
    // Note: Buffer is not included here since it's Node.js-only and this code runs in browsers.
    // Node.js Buffer extends Uint8Array, so Uint8Array validation handles Buffer values too.
    z.instanceof(URL),
  ]),
  mimeType: z.string().optional(),
  experimental_providerMetadata: providerMetadataSchema,
})
const filePartSchema = z.object({
  type: z.literal('file'),
  data: z.union([
    z.string(),
    z.instanceof(Uint8Array),
    z.instanceof(ArrayBuffer),
    // Note: Buffer is not included here since it's Node.js-only and this code runs in browsers.
    // Node.js Buffer extends Uint8Array, so Uint8Array validation handles Buffer values too.
    z.instanceof(URL),
  ]),
  mediaType: z.string(),
  experimental_providerMetadata: providerMetadataSchema,
})
const toolCallPartSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(jsonValueSchema),
  experimental_providerMetadata: providerMetadataSchema,
})
const toolResultPartSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
  experimental_content: z
    .array(
      z.union([
        z.object({
          type: z.literal('text'),
          text: z.string(),
        }),
        z.object({
          type: z.literal('image'),
          data: z.string(),
          mimeType: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  isError: z.boolean().optional(),
  experimental_providerMetadata: providerMetadataSchema,
})
const coreSystemMessageSchema = z.object({
  role: z.literal('system'),
  content: z.string(),
  experimental_providerMetadata: providerMetadataSchema,
})
const coreUserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.union([
    z.string(),
    z.array(z.union([textPartSchema, imagePartSchema, filePartSchema])),
  ]),
  experimental_providerMetadata: providerMetadataSchema,
})
const coreAssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.union([z.string(), z.array(z.union([textPartSchema, toolCallPartSchema]))]),
  experimental_providerMetadata: providerMetadataSchema,
})
const coreToolMessageSchema = z.object({
  role: z.literal('tool'),
  content: z.array(toolResultPartSchema),
  experimental_providerMetadata: providerMetadataSchema,
})
const coreMessageSchema = z.discriminatedUnion('role', [
  coreSystemMessageSchema,
  coreUserMessageSchema,
  coreAssistantMessageSchema,
  coreToolMessageSchema,
])

export const meta: RobotMetaInput = {
  name: 'AiChatRobot',
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
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
  // Is this a sensbile minimum charge? What if the customer supplies their own keys? Is it low enough for these cases?
  minimumChargeUsd: 0.06,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'alpha',
}

export const vendorModelSchema = z
  .string()
  .regex(/^[a-z]+\/[a-z0-9.-]+$/, 'Must be in format "vendor/model"')
  .refine(
    (val) => {
      const [vendor, model] = val.split('/')
      if (vendor === 'anthropic') {
        return model === 'claude-4-sonnet-20250514' || model === 'claude-4-opus-20250514'
      }
      if (vendor === 'openai') {
        return (
          model === 'gpt-4.1-2025-04-14' ||
          model === 'chatgpt-4o-latest' ||
          model === 'o3-2025-04-16' ||
          model === 'gpt-4o-audio-preview'
        )
      }
      if (vendor === 'google') {
        return model === 'gemini-2.5-pro'
      }
      if (vendor === 'moonshot') {
        return model === 'kimi-k2'
      }
      return false
    },
    {
      message:
        'Invalid vendor/model combination. Supported: anthropic/claude-4-sonnet-20250514, anthropic/claude-4-opus-20250514, openai/gpt-4.1-2025-04-14, openai/chatgpt-4o-latest, openai/o3-2025-04-16, openai/gpt-4o-audio-preview, google/gemini-2.5-pro, moonshot/kimi-k2',
    },
  )

export type VendorModel = z.infer<typeof vendorModelSchema>

/**
 * Model capabilities for /ai/chat. This centralizes which models support which input types.
 * Key format: 'vendor/model'
 */
export const MODEL_CAPABILITIES: Record<string, { pdf: boolean; image: boolean }> = {
  'anthropic/claude-4-sonnet-20250514': { pdf: true, image: true },
  'anthropic/claude-4-opus-20250514': { pdf: true, image: true },
  'google/gemini-2.5-pro': { pdf: true, image: true },
  'openai/gpt-4.1-2025-04-14': { pdf: false, image: true },
  'openai/chatgpt-4o-latest': { pdf: false, image: true },
  'openai/o3-2025-04-16': { pdf: false, image: true },
  'openai/gpt-4o-audio-preview': { pdf: false, image: false },
  'moonshot/kimi-k2': { pdf: false, image: false },
}

export const robotAiChatInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/ai/chat'),
    // TODO: Is the auto mode yet implemented?
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
      .describe('Set the system/developer prompt, if the model allows it'),
    credentials: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Names of template credentials to make available to the robot.'),
    mcp_servers: z
      .array(
        z.object({
          type: z.enum(['sse', 'http']),
          url: z.string(),
          headers: z.record(z.string()).optional(),
        }),
      )
      .optional()
      .describe('The MCP servers to use. This is used to call tools from the LLM.'),
  })
  .strict()

export const robotAiChatInstructionsWithHiddenFieldsSchema = robotAiChatInstructionsSchema.extend({
  result: z.union([z.literal('debug'), robotAiChatInstructionsSchema.shape.result]),
  provider: z
    .string()
    .optional()
    .describe(
      'Where to run the model. By the default, it is the vendor. For instance, anthropic:claude* runs on the Anthropic API. But, Claude could also be run on AWS Bedrock. This is a hidden placeholder for now, but will be used in the future to allow for more flexibility in where to run models. ',
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

export type RobotAiChatInstructionsWithHiddenFields = z.infer<
  typeof robotAiChatInstructionsWithHiddenFieldsSchema
>

export type RobotAiChatInstructionsWithHiddenFieldsInput = z.input<
  typeof robotAiChatInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAiChatInstructionsSchema = interpolateRobot(
  robotAiChatInstructionsSchema,
)
export type InterpolatableRobotAiChatInstructions = z.infer<
  typeof interpolatableRobotAiChatInstructionsSchema
>
export type InterpolatableRobotAiChatInstructionsInput = z.input<
  typeof interpolatableRobotAiChatInstructionsSchema
>

export const interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAiChatInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAiChatInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema
>
