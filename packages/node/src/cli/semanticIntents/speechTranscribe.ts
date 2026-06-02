import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
} from '../intentRuntime.ts'
import type { SemanticIntentDescriptor, SemanticIntentPresentation } from './index.ts'

import { parseOptionalEnumValue } from './parsing.ts'

const speechTranscribeProviders = ['aws', 'gcp', 'replicate'] as const
const speechTranscribeFormats = ['text', 'json', 'srt', 'webvtt'] as const

type SpeechTranscribeProvider = (typeof speechTranscribeProviders)[number]
type SpeechTranscribeFormat = (typeof speechTranscribeFormats)[number]

const defaultSpeechTranscribeProvider = 'replicate' satisfies SpeechTranscribeProvider
const defaultSpeechTranscribeFormat = 'text' satisfies SpeechTranscribeFormat

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
      description: 'Provider to use for transcription. Defaults to replicate.',
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
      description: 'Target written language for providers that support translation.',
      required: false,
      exampleValue: 'en-US',
    },
  ] as const satisfies readonly IntentOptionDefinition[],
} satisfies IntentDynamicStepExecutionDefinition

const speechTranscribeCommandPresentation = {
  description: 'Transcribe speech in audio or video files',
  details:
    'Runs `/speech/transcribe` with a text-first default and writes the transcript to `--output`.',
  examples: [
    [
      'Transcribe an audio file to text',
      'transloadit speech transcribe --input voice.opus --output voice.txt',
    ],
    [
      'Generate subtitles',
      'transloadit speech transcribe --input clip.mp4 --format webvtt --output captions.vtt',
    ],
  ] as Array<[string, string]>,
} as const satisfies SemanticIntentPresentation

function parseProvider(value: unknown): SpeechTranscribeProvider {
  return (
    parseOptionalEnumValue({
      flagName: '--provider',
      supportedValues: speechTranscribeProviders,
      value,
    }) ?? defaultSpeechTranscribeProvider
  )
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

function createSpeechTranscribeStep(
  rawValues: Record<string, unknown>,
  _context: { hasInputs: boolean },
): Record<string, unknown> {
  const provider = parseProvider(rawValues.provider)
  const format = parseFormat(rawValues.format)
  const sourceLanguage = parseOptionalString(rawValues.source_language, '--source-language')
  const targetLanguage = parseOptionalString(rawValues.target_language, '--target-language')

  return {
    robot: '/speech/transcribe',
    use: ':original',
    result: true,
    provider,
    format,
    ...(sourceLanguage != null ? { source_language: sourceLanguage } : {}),
    ...(targetLanguage != null ? { target_language: targetLanguage } : {}),
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
