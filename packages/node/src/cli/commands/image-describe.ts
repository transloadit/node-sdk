import { statSync } from 'node:fs'
import { Command, Option } from 'clipanion'

import type { InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput } from '../../alphalib/types/robots/ai-chat.ts'
import type { InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput } from '../../alphalib/types/robots/image-describe.ts'
import {
  concurrencyOption,
  countProvidedInputs,
  deleteAfterProcessingOption,
  inputPathsOption,
  recursiveOption,
  reprocessStaleOption,
  validateSharedFileProcessingOptions,
  watchOption,
} from '../fileProcessingOptions.ts'
import { prepareIntentInputs } from '../intentRuntime.ts'
import type { AssembliesCreateOptions } from './assemblies.ts'
import * as assembliesCommands from './assemblies.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

const imageDescribeFields = ['labels', 'altText', 'title', 'caption', 'description'] as const

type ImageDescribeField = (typeof imageDescribeFields)[number]

const wordpressDescribeFields = [
  'altText',
  'title',
  'caption',
  'description',
] as const satisfies readonly ImageDescribeField[]

const defaultDescribeModel = 'anthropic/claude-sonnet-4-5'

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseFields(value: string[] | undefined): ImageDescribeField[] {
  const rawFields = (value ?? [])
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter(Boolean)

  if (rawFields.length === 0) {
    return []
  }

  const fields: ImageDescribeField[] = []
  const seen = new Set<ImageDescribeField>()

  for (const rawField of rawFields) {
    if (!imageDescribeFields.includes(rawField as ImageDescribeField)) {
      throw new Error(
        `Unsupported --fields value "${rawField}". Supported values: ${imageDescribeFields.join(', ')}`,
      )
    }

    const field = rawField as ImageDescribeField
    if (seen.has(field)) {
      continue
    }

    seen.add(field)
    fields.push(field)
  }

  return fields
}

function resolveProfile(profile: string | undefined): 'wordpress' | null {
  if (profile == null) {
    return null
  }

  if (profile === 'wordpress') {
    return 'wordpress'
  }

  throw new Error(`Unsupported --for value "${profile}". Supported values: wordpress`)
}

function resolveRequestedFields({
  explicitFields,
  profile,
}: {
  explicitFields: ImageDescribeField[]
  profile: 'wordpress' | null
}): ImageDescribeField[] {
  if (
    explicitFields.length > 0 &&
    !(explicitFields.length === 1 && explicitFields[0] === 'labels')
  ) {
    return explicitFields
  }

  if (profile === 'wordpress') {
    return [...wordpressDescribeFields]
  }

  return explicitFields.length === 0 ? ['labels'] : explicitFields
}

function validateRequestedFields({
  explicitFields,
  fields,
  model,
  profile,
}: {
  explicitFields: ImageDescribeField[]
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

  if (explicitFields.length === 0 && profile == null) {
    return
  }
}

function buildAiChatSchema(fields: readonly ImageDescribeField[]): Record<string, unknown> {
  const properties = Object.fromEntries(
    fields.map((field) => {
      const description =
        field === 'altText'
          ? 'A concise accessibility-focused alt text that objectively describes the image'
          : field === 'title'
            ? 'A concise publishable title for the image'
            : field === 'caption'
              ? 'A short caption suitable for displaying below the image'
              : 'A richer description of the image suitable for CMS usage'

      return [
        field,
        {
          type: 'string',
          description,
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

function buildAiChatMessages({
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

function buildLabelStep(): InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput {
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

function buildAiChatStep({
  fields,
  model,
  profile,
}: {
  fields: readonly ImageDescribeField[]
  model: string
  profile: 'wordpress' | null
}): InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput {
  const { messages, systemMessage } = buildAiChatMessages({ fields, profile })

  return {
    robot: '/ai/chat',
    use: ':original',
    result: true,
    model,
    format: 'json',
    return_messages: 'last',
    test_credentials: true,
    schema: JSON.stringify(buildAiChatSchema(fields)),
    messages,
    system_message: systemMessage,
    // @TODO Move these inline /ai/chat instructions into a builtin template in api2 and
    // switch this command to call that builtin instead of shipping prompt logic in the CLI.
  }
}

function buildDescribeStep({
  fields,
  model,
  profile,
}: {
  fields: readonly ImageDescribeField[]
  model: string
  profile: 'wordpress' | null
}):
  | InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput
  | InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput {
  if (fields.length === 1 && fields[0] === 'labels') {
    return buildLabelStep()
  }

  return buildAiChatStep({ fields, model, profile })
}

export class ImageDescribeCommand extends AuthenticatedCommand {
  static override paths = [['image', 'describe']]

  static override usage = Command.Usage({
    category: 'Intent Commands',
    description: 'Describe images as labels or publishable text fields',
    details:
      'Generates image labels through `/image/describe`, or structured altText/title/caption/description through `/ai/chat`, then writes the JSON result to `--out`.',
    examples: [
      [
        'Describe an image as labels',
        'transloadit image describe --input hero.jpg --out labels.json',
      ],
      [
        'Generate WordPress-ready fields',
        'transloadit image describe --input hero.jpg --for wordpress --out fields.json',
      ],
      [
        'Request a custom field set',
        'transloadit image describe --input hero.jpg --fields altText,title,caption --out fields.json',
      ],
    ],
  })

  outputPath = Option.String('--out,-o', {
    description: 'Write the JSON result to this path or directory',
    required: true,
  })

  inputs = inputPathsOption('Provide an input path, directory, URL, or - for stdin')

  inputBase64 = Option.Array('--input-base64', {
    description: 'Provide base64-encoded input content directly',
  })

  fields = Option.Array('--fields', {
    description:
      'Describe output fields to generate, for example labels or altText,title,caption,description',
  })

  forProfile = Option.String('--for', {
    description: 'Use a named output profile, currently: wordpress',
  })

  model = Option.String('--model', defaultDescribeModel, {
    description: `Model to use for generated text fields (default: ${defaultDescribeModel})`,
  })

  recursive = recursiveOption()

  deleteAfterProcessing = deleteAfterProcessingOption()

  reprocessStale = reprocessStaleOption()

  watch = watchOption()

  concurrency = concurrencyOption()

  private getProvidedInputCount(): number {
    return countProvidedInputs({
      inputs: this.inputs,
      inputBase64: this.inputBase64,
    })
  }

  private hasTransientInputSources(): boolean {
    return (
      (this.inputs?.some((input) => isHttpUrl(input)) ?? false) ||
      (this.inputBase64?.length ?? 0) > 0
    )
  }

  private isDirectoryOutputTarget(): boolean {
    try {
      return statSync(this.outputPath).isDirectory()
    } catch {
      return false
    }
  }

  protected override async run(): Promise<number | undefined> {
    if (this.getProvidedInputCount() === 0) {
      this.output.error('image describe requires --input or --input-base64')
      return 1
    }

    const sharedValidationError = validateSharedFileProcessingOptions({
      explicitInputCount: this.getProvidedInputCount(),
      singleAssembly: false,
      watch: this.watch,
      watchRequiresInputsMessage: 'image describe --watch requires --input or --input-base64',
    })
    if (sharedValidationError != null) {
      this.output.error(sharedValidationError)
      return 1
    }

    if (this.watch && this.hasTransientInputSources()) {
      this.output.error('--watch is only supported for filesystem inputs')
      return 1
    }

    const explicitFields = parseFields(this.fields)
    const profile = resolveProfile(this.forProfile)
    const requestedFields = resolveRequestedFields({ explicitFields, profile })
    validateRequestedFields({
      explicitFields,
      fields: requestedFields,
      model: this.model,
      profile,
    })

    const preparedInputs = await prepareIntentInputs({
      inputValues: this.inputs ?? [],
      inputBase64Values: this.inputBase64 ?? [],
    })

    try {
      if (this.watch && preparedInputs.hasTransientInputs) {
        this.output.error('--watch is only supported for filesystem inputs')
        return 1
      }

      const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
        del: this.deleteAfterProcessing,
        inputs: preparedInputs.inputs,
        recursive: this.recursive,
        reprocessStale: this.reprocessStale,
        watch: this.watch,
        concurrency: this.concurrency,
        output: this.outputPath,
        outputMode: this.isDirectoryOutputTarget() ? 'directory' : 'file',
        stepsData: {
          describe: buildDescribeStep({
            fields: requestedFields,
            model: this.model,
            profile,
          }),
        } satisfies AssembliesCreateOptions['stepsData'],
      })

      return hasFailures ? 1 : undefined
    } finally {
      await Promise.all(preparedInputs.cleanup.map((cleanup) => cleanup()))
    }
  }
}
