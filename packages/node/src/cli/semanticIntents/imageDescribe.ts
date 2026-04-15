import { parseStringArrayValue } from '../intentFields.ts'
import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
} from '../intentRuntime.ts'
import type { SemanticIntentDescriptor, SemanticIntentPresentation } from './index.ts'
import { parseOptionalEnumValue, parseUniqueEnumArray } from './parsing.ts'

const imageDescribeFields = ['labels', 'altText', 'title', 'caption', 'description'] as const

type ImageDescribeField = (typeof imageDescribeFields)[number]

const wordpressDescribeFields = [
  'altText',
  'title',
  'caption',
  'description',
] as const satisfies readonly ImageDescribeField[]

const defaultDescribeModel = 'anthropic/claude-4-sonnet-20250514'
const describeFieldDescriptions = {
  altText: 'A concise accessibility-focused alt text that objectively describes the image',
  title: 'A concise publishable title for the image',
  caption: 'A short caption suitable for displaying below the image',
  description: 'A richer description of the image suitable for CMS usage',
} as const satisfies Record<Exclude<ImageDescribeField, 'labels'>, string>

const imageDescribeExecutionDefinition = {
  kind: 'dynamic-step',
  handler: 'image-describe',
  resultStepName: 'describe',
  fields: [
    {
      name: 'fields',
      kind: 'string-array',
      propertyName: 'fields',
      optionFlags: '--fields',
      description:
        'Describe output fields to generate, for example labels or altText,title,caption,description',
      required: false,
    },
    {
      name: 'forProfile',
      kind: 'string',
      propertyName: 'forProfile',
      optionFlags: '--for',
      description: 'Use a named output profile, currently: wordpress',
      required: false,
    },
    {
      name: 'model',
      kind: 'string',
      propertyName: 'model',
      optionFlags: '--model',
      description:
        'Model to use for generated text fields (default: anthropic/claude-4-sonnet-20250514)',
      required: false,
    },
  ] as const satisfies readonly IntentOptionDefinition[],
} satisfies IntentDynamicStepExecutionDefinition

const imageDescribeCommandPresentation = {
  description: 'Describe images as labels or publishable text fields',
  details:
    'Generates image labels through `/image/describe`, or structured altText/title/caption/description through `/ai/chat`, then writes the JSON result to `--output`.',
  examples: [
    [
      'Describe an image as labels',
      'transloadit image describe --input hero.jpg --output labels.json',
    ],
    [
      'Generate WordPress-ready fields',
      'transloadit image describe --input hero.jpg --for wordpress --output fields.json',
    ],
    [
      'Request a custom field set',
      'transloadit image describe --input hero.jpg --fields altText,title,caption --output fields.json',
    ],
  ] as Array<[string, string]>,
} as const satisfies SemanticIntentPresentation

function parseDescribeFields(value: string[] | undefined): ImageDescribeField[] {
  const rawFields = parseStringArrayValue(value ?? [])
  return parseUniqueEnumArray({
    flagName: '--fields',
    supportedValues: imageDescribeFields,
    values: rawFields,
  })
}

function resolveDescribeProfile(profile: string | undefined): 'wordpress' | null {
  return parseOptionalEnumValue({
    flagName: '--for',
    supportedValues: ['wordpress'] as const,
    value: profile,
  })
}

function resolveRequestedDescribeFields({
  explicitFields,
  profile,
}: {
  explicitFields: ImageDescribeField[]
  profile: 'wordpress' | null
}): ImageDescribeField[] {
  if (explicitFields.length > 0) {
    return explicitFields
  }

  if (profile === 'wordpress') {
    return [...wordpressDescribeFields]
  }

  return ['labels']
}

function validateDescribeFields({
  fields,
  model,
  profile,
}: {
  fields: ImageDescribeField[]
  model: string
  profile: 'wordpress' | null
}): void {
  const includesLabels = fields.includes('labels')

  if (includesLabels && fields.length > 1) {
    throw new Error(
      'The labels field cannot be combined with altText, title, caption, or description',
    )
  }

  if (includesLabels && profile != null) {
    throw new Error('--for cannot be combined with --fields labels')
  }

  if (includesLabels && model !== defaultDescribeModel) {
    throw new Error(
      '--model is only supported when generating altText, title, caption, or description',
    )
  }
}

function resolveImageDescribeRequest(rawValues: Record<string, unknown>): {
  fields: ImageDescribeField[]
  profile: 'wordpress' | null
} {
  const explicitFields = parseDescribeFields(rawValues.fields as string[] | undefined)
  const profile = resolveDescribeProfile(rawValues.forProfile as string | undefined)
  const fields = resolveRequestedDescribeFields({ explicitFields, profile })
  validateDescribeFields({
    fields,
    model: String(rawValues.model ?? defaultDescribeModel),
    profile,
  })

  return { fields, profile }
}

function buildDescribeAiChatSchema(fields: readonly ImageDescribeField[]): Record<string, unknown> {
  const properties = Object.fromEntries(
    fields.map((field) => {
      return [
        field,
        {
          type: 'string',
          description: describeFieldDescriptions[field as Exclude<ImageDescribeField, 'labels'>],
        },
      ]
    }),
  )

  return {
    type: 'object',
    additionalProperties: false,
    required: [...fields],
    properties,
  }
}

function buildDescribeAiChatMessages({
  fields,
  profile,
}: {
  fields: readonly ImageDescribeField[]
  profile: 'wordpress' | null
}): {
  messages: string
  systemMessage: string
} {
  const requestedFields = fields.join(', ')
  const profileHint =
    profile === 'wordpress'
      ? 'The output is for the WordPress media library.'
      : 'The output is for a publishing workflow.'

  return {
    systemMessage: [
      'You generate accurate image copy for publishing workflows.',
      profileHint,
      'Return only the schema fields requested.',
      'Be concrete, concise, and faithful to what is visibly present in the image.',
      'Do not invent facts, brands, locations, or identities that are not clearly visible.',
      'Avoid keyword stuffing, hype, and mentions of SEO or accessibility in the output itself.',
      'For altText, write one objective sentence focused on what matters to someone who cannot see the image.',
      'For title, keep it short and natural.',
      'For caption, write one short sentence suitable for publication.',
      'For description, write one or two sentences with slightly more context than the caption.',
    ].join(' '),
    messages: `Analyze the attached image and fill these fields: ${requestedFields}.`,
  }
}

function createImageDescribeStep(
  rawValues: Record<string, unknown>,
  _context: { hasInputs: boolean },
): Record<string, unknown> {
  const { fields, profile } = resolveImageDescribeRequest(rawValues)
  if (fields.length === 1 && fields[0] === 'labels') {
    return {
      robot: '/image/describe',
      use: ':original',
      result: true,
      provider: 'aws',
      format: 'json',
      granularity: 'list',
      explicit_descriptions: false,
    }
  }

  const { messages, systemMessage } = buildDescribeAiChatMessages({ fields, profile })

  return {
    robot: '/ai/chat',
    use: ':original',
    result: true,
    model: String(rawValues.model ?? defaultDescribeModel),
    format: 'json',
    return_messages: 'last',
    test_credentials: true,
    schema: JSON.stringify(buildDescribeAiChatSchema(fields)),
    messages,
    system_message: systemMessage,
    // @TODO Move these inline /ai/chat instructions into a builtin template in api2 and
    // switch this command to call that builtin instead of shipping prompt logic in the CLI.
  }
}

export const imageDescribeSemanticIntentDescriptor = {
  createStep: createImageDescribeStep,
  defaultOutputPath: 'output.json',
  execution: imageDescribeExecutionDefinition,
  inputPolicy: { kind: 'required' },
  outputDescription: 'Write the JSON result to this path or directory',
  presentation: imageDescribeCommandPresentation,
  runnerKind: 'watchable',
} as const satisfies SemanticIntentDescriptor
