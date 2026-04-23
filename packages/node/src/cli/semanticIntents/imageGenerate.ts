import { basename } from 'node:path'
import type { IntentOptionDefinition, PreparedIntentInputs } from '../intentRuntime.ts'
import type { SemanticIntentDescriptor, SemanticIntentPresentation } from './index.ts'
import { parseOptionalEnumValue } from './parsing.ts'

const defaultImageGenerateModel = 'google/nano-banana-2'
const imageGenerateFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg'] as const

const imageGenerateOptionDefinitions = [
  {
    name: 'prompt',
    kind: 'string',
    propertyName: 'prompt',
    optionFlags: '--prompt',
    description: 'The prompt describing the desired image content.',
    required: true,
    exampleValue: JSON.stringify('A red bicycle in a studio'),
  },
  {
    name: 'model',
    kind: 'string',
    propertyName: 'model',
    optionFlags: '--model',
    description: `The AI model to use for image generation. Defaults to ${defaultImageGenerateModel}. Backend-supported models include openai/gpt-image-2 and Google Nano Banana variants.`,
    required: false,
    exampleValue: defaultImageGenerateModel,
  },
  {
    name: 'format',
    kind: 'string',
    propertyName: 'format',
    optionFlags: '--format',
    description: 'Format of the generated image.',
    required: false,
    exampleValue: 'jpg',
  },
  {
    name: 'seed',
    kind: 'number',
    propertyName: 'seed',
    optionFlags: '--seed',
    description: 'Seed for the random number generator.',
    required: false,
  },
  {
    name: 'aspectRatio',
    kind: 'string',
    propertyName: 'aspectRatio',
    optionFlags: '--aspect-ratio',
    description: 'Aspect ratio of the generated image.',
    required: false,
  },
  {
    name: 'height',
    kind: 'number',
    propertyName: 'height',
    optionFlags: '--height',
    description: 'Height of the generated image.',
    required: false,
  },
  {
    name: 'width',
    kind: 'number',
    propertyName: 'width',
    optionFlags: '--width',
    description: 'Width of the generated image.',
    required: false,
  },
  {
    name: 'style',
    kind: 'string',
    propertyName: 'style',
    optionFlags: '--style',
    description: 'Style of the generated image.',
    required: false,
  },
  {
    name: 'numOutputs',
    kind: 'number',
    propertyName: 'numOutputs',
    optionFlags: '--num-outputs',
    description: 'Number of image variants to generate.',
    required: false,
  },
] as const satisfies readonly IntentOptionDefinition[]

const imageGenerateCommandPresentation = {
  description: 'Generate images from text prompts',
  details:
    'Runs `/image/generate`. Without inputs, this is text-to-image. With one or more `--input` files, the inputs are bundled into a single assembly so the prompt can refer to them by filename.',
  examples: [
    [
      'Generate an image from text',
      'transloadit image generate --prompt "A red bicycle in a studio" --output output.png',
    ],
    [
      'Generate with OpenAI gpt-image-2',
      'transloadit image generate --model openai/gpt-image-2 --width 1024 --height 1024 --prompt "A ceramic coffee mug on a white sweep" --output output.png',
    ],
    [
      'Guide generation with one input image',
      'transloadit image generate --input subject.jpg --prompt "Place subject.jpg on a magazine cover" --output output.png',
    ],
    [
      'Guide generation with multiple input images',
      'transloadit image generate --input person1.jpg --input person2.jpg --input background.jpg --prompt "Place person1.jpg feeding person2.jpg in front of background.jpg" --output output.png',
    ],
  ] as Array<[string, string]>,
} as const satisfies SemanticIntentPresentation

function parseOptionalFormat(value: unknown): (typeof imageGenerateFormats)[number] | null {
  return parseOptionalEnumValue({
    flagName: '--format',
    supportedValues: imageGenerateFormats,
    value,
  })
}

function parseRequiredPrompt(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('image generate requires --prompt')
  }

  return value
}

function parseOptionalNumber(flagName: string, value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined
  }

  const numericValue = typeof value === 'number' ? value : Number(String(value).trim())
  if (Number.isNaN(numericValue)) {
    throw new Error(`${flagName} must be a number`)
  }

  return numericValue
}

function parseOptionalIntegerRange(
  flagName: string,
  value: unknown,
  { max, min }: { max: number; min: number },
): number | undefined {
  const numericValue = parseOptionalNumber(flagName, value)
  if (numericValue == null) {
    return undefined
  }

  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
    throw new Error(`${flagName} must be an integer between ${min} and ${max}`)
  }

  return numericValue
}

function createImageGenerateStep(
  rawValues: Record<string, unknown>,
  context: { hasInputs: boolean },
): Record<string, unknown> {
  const step: Record<string, unknown> = {
    robot: '/image/generate',
    result: true,
    model: defaultImageGenerateModel,
    prompt: parseRequiredPrompt(rawValues.prompt),
  }

  if (context.hasInputs) {
    step.use = {
      steps: [':original'],
      bundle_steps: true,
    }
  }

  const model = rawValues.model
  if (typeof model === 'string' && model.trim() !== '') {
    step.model = model
  }

  const format = parseOptionalFormat(rawValues.format)
  if (format != null) {
    step.format = format
  }

  const seed = parseOptionalNumber('--seed', rawValues.seed)
  if (seed != null) {
    step.seed = seed
  }

  const aspectRatio = rawValues.aspectRatio
  if (typeof aspectRatio === 'string' && aspectRatio.trim() !== '') {
    step.aspect_ratio = aspectRatio
  }

  const height = parseOptionalNumber('--height', rawValues.height)
  if (height != null) {
    step.height = height
  }

  const width = parseOptionalNumber('--width', rawValues.width)
  if (width != null) {
    step.width = width
  }

  const style = rawValues.style
  if (typeof style === 'string' && style.trim() !== '') {
    step.style = style
  }

  const numOutputs = parseOptionalIntegerRange('--num-outputs', rawValues.numOutputs, {
    min: 1,
    max: 10,
  })
  if (numOutputs != null) {
    step.num_outputs = numOutputs
  }

  return step
}

function ensureUniqueInputBasenames(preparedInputs: PreparedIntentInputs): PreparedIntentInputs {
  const seenBasenames = new Map<string, string>()

  for (const input of preparedInputs.inputs) {
    const inputBasename = basename(input)
    const previousInput = seenBasenames.get(inputBasename)
    if (previousInput != null) {
      throw new Error(
        `image generate requires unique input basenames when prompts refer to files; found duplicate ${inputBasename} in ${previousInput} and ${input}`,
      )
    }

    seenBasenames.set(inputBasename, input)
  }

  return preparedInputs
}

export const imageGenerateSemanticIntentDescriptor = {
  createStep: createImageGenerateStep,
  defaultOutputPath: 'output.png',
  execution: {
    kind: 'dynamic-step',
    handler: 'image-generate',
    resultStepName: 'generate',
    fields: imageGenerateOptionDefinitions,
  },
  inputPolicy: {
    kind: 'optional',
    field: 'prompt',
    attachUseWhenInputsProvided: false,
  },
  outputDescription: 'Write the result to this path',
  async prepareInputs(preparedInputs) {
    return await Promise.resolve(ensureUniqueInputBasenames(preparedInputs))
  },
  presentation: imageGenerateCommandPresentation,
  runnerKind: 'bundled',
} as const satisfies SemanticIntentDescriptor
