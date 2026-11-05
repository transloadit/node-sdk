import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
} from '../intentRuntime.ts'
import type { SemanticIntentDescriptor, SemanticIntentPresentation } from './index.ts'

import { robotSpeechTranscribeInstructionsSchema } from '../../alphalib/types/robots/speech-transcribe.ts'
import { parseOptionalEnumValue } from './parsing.ts'

const speechTranscribeProviders = ['aws', 'gcp', 'replicate'] as const
const speechTranscribeFormats = ['text', 'json', 'srt', 'webvtt'] as const

type SpeechTranscribeProvider = (typeof speechTranscribeProviders)[number]
type SpeechTranscribeFormat = (typeof speechTranscribeFormats)[number]

const defaultSpeechTranscribeProvider = 'replicate' satisfies SpeechTranscribeProvider
const defaultSpeechTranscribeFormat = 'text' satisfies SpeechTranscribeFormat
// Keep schema guidance canonical while displaying the CLI flag and a single aligned option line.
const targetLanguageDescription = (
  robotSpeechTranscribeInstructionsSchema.shape.target_language.description ?? ''
)
  .replaceAll('`source_language`', '`--source-language`')
  .replace(/\s+/g, ' ')
  .trim()

const speechTranscribeExecutionDefinition = {
  kind: 'dynamic-step',
  handler: 'speech-transcribe',
  resultStepName: 'transcribe',
  fields: [
    {
      name: 'provider',
      kind: 'string',
      propertyName: 'provider',
      optionFlags: '--provider',
      description:
        'Provider to use for transcription. Defaults to replicate, or to aws with --speaker-labels.',
      required: false,
      exampleValue: defaultSpeechTranscribeProvider,
    },
    {
      name: 'format',
      kind: 'string',
      propertyName: 'format',
      optionFlags: '--format',
      description: 'Output format. Defaults to text.',
      required: false,
      exampleValue: defaultSpeechTranscribeFormat,
    },
    {
      name: 'source_language',
      kind: 'string',
      propertyName: 'sourceLanguage',
      optionFlags: '--source-language',
      description:
        'Spoken language as a BCP-47 code, for providers that support explicit source languages.',
      required: false,
      exampleValue: 'en-US',
    },
    {
      name: 'target_language',
      kind: 'string',
      propertyName: 'targetLanguage',
      optionFlags: '--target-language',
      description: targetLanguageDescription,
      required: false,
      exampleValue: 'french',
    },
    {
      name: 'speaker_labels',
      kind: 'boolean',
      propertyName: 'speakerLabels',
      optionFlags: '--speaker-labels',
      description:
        'Label who is speaking: one paragraph per speaker in text, voice spans in WebVTT. Uses aws or gcp.',
      required: false,
    },
    {
      name: 'max_speakers',
      kind: 'number',
      propertyName: 'maxSpeakers',
      optionFlags: '--max-speakers',
      description: 'Maximum number of speakers to label, from 1 to 10. Requires --speaker-labels.',
      required: false,
      exampleValue: 2,
    },
  ] as const satisfies readonly IntentOptionDefinition[],
} satisfies IntentDynamicStepExecutionDefinition

const speechTranscribeCommandPresentation = {
  description: 'Transcribe speech in audio or video files',
  // Option tables abbreviate descriptions, so keep the complete language guidance in the details.
  details: `Runs \`/speech/transcribe\` with a text-first default and writes the transcript to \`--output\`.

\`--target-language\`: ${targetLanguageDescription}`,
  examples: [
    [
      'Transcribe an audio file to text',
      'transloadit speech transcribe --input voice.opus --output voice.txt',
    ],
    [
      'Generate subtitles',
      'transloadit speech transcribe --input clip.mp4 --format webvtt --output captions.vtt',
    ],
    [
      'Label who is speaking in an interview',
      'transloadit speech transcribe --input interview.mp4 --speaker-labels --output interview.txt',
    ],
  ] as Array<[string, string]>,
} as const satisfies SemanticIntentPresentation

function parseProvider(value: unknown): SpeechTranscribeProvider | null {
  return parseOptionalEnumValue({
    flagName: '--provider',
    supportedValues: speechTranscribeProviders,
    value,
  })
}

function parseFormat(value: unknown): SpeechTranscribeFormat {
  return (
    parseOptionalEnumValue({
      flagName: '--format',
      supportedValues: speechTranscribeFormats,
      value,
    }) ?? defaultSpeechTranscribeFormat
  )
}

function parseOptionalString(value: unknown, flagName: string): string | null {
  if (value == null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${flagName} must be a string`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseMaxSpeakers(value: unknown, speakerLabels: boolean): number | null {
  if (value == null) {
    return null
  }

  if (!speakerLabels) {
    throw new Error('--max-speakers requires --speaker-labels')
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error('--max-speakers must be an integer from 1 to 10')
  }

  return value
}

function createSpeechTranscribeStep(
  rawValues: Record<string, unknown>,
  _context: { hasInputs: boolean },
): Record<string, unknown> {
  const requestedProvider = parseProvider(rawValues.provider)
  const format = parseFormat(rawValues.format)
  const sourceLanguage = parseOptionalString(rawValues.source_language, '--source-language')
  const targetLanguage = parseOptionalString(rawValues.target_language, '--target-language')
  const speakerLabels = rawValues.speaker_labels === true
  const maxSpeakers = parseMaxSpeakers(rawValues.max_speakers, speakerLabels)

  if (speakerLabels && requestedProvider === 'replicate') {
    throw new Error('--speaker-labels needs --provider aws or gcp')
  }

  // Without an explicit provider, the API picks one that supports speaker labels.
  const provider = speakerLabels
    ? requestedProvider
    : (requestedProvider ?? defaultSpeechTranscribeProvider)

  return {
    robot: '/speech/transcribe',
    use: ':original',
    result: true,
    ...(provider != null ? { provider } : {}),
    format,
    ...(sourceLanguage != null ? { source_language: sourceLanguage } : {}),
    ...(targetLanguage != null ? { target_language: targetLanguage } : {}),
    ...(speakerLabels ? { speaker_labels: true } : {}),
    ...(maxSpeakers != null ? { max_speakers: maxSpeakers } : {}),
  }
}

export const speechTranscribeSemanticIntentDescriptor = {
  createStep: createSpeechTranscribeStep,
  defaultOutputPath: 'output.txt',
  execution: speechTranscribeExecutionDefinition,
  inputPolicy: { kind: 'required' },
  outputDescription: 'Write the transcript to this path or directory',
  presentation: speechTranscribeCommandPresentation,
  runnerKind: 'watchable',
} as const satisfies SemanticIntentDescriptor
