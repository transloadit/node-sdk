import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { zodWithConservativeJsonInputSchema } from '../../lib/zodInputSemantics.ts'
import {
  autoProviderDescription,
  createProcessingExample,
  defineRobotWithHiddenFields,
  granularitySchema,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

const speechTranscribeProviderSchema = z.enum(['auto', 'aws', 'gcp', 'replicate']).default('auto')
const speechTranscribeProviderWithHiddenFieldsSchema = z
  .enum(['auto', 'aws', 'gcp', 'replicate', 'transloadit'])
  .default('auto')

/** Shared vocabulary limits keep inline hints within GCP and Whisper prompt budgets. */
export const speechTranscribeVocabularySchema = zodWithConservativeJsonInputSchema(
  z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[^\p{Cc}]+$/u),
    )
    .max(50)
    .refine((terms) => new Set(terms.map((term) => term.toLowerCase())).size === terms.length, {
      message: 'Vocabulary terms must be unique, ignoring case.',
    })
    // Byte-level tokenization uses at most one token per byte. Reserve room for sentence styling.
    .refine((terms) => new TextEncoder().encode(terms.join(', ')).byteLength <= 200, {
      message: 'Vocabulary terms joined with comma-space must not exceed 200 UTF-8 bytes.',
    }),
  // Trimming, Unicode case uniqueness and a joined UTF-8 budget have no portable JSON Schema form.
  z.array(z.string().min(1)).max(50),
)

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('transcribed', '/speech/transcribe', {
    provider: 'replicate',
    target_language: 'french',
    format: 'text',
  }),
  example_code_description:
    'Transcribe French speech from uploaded audio or video, and save it to a text file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses AI services. The providers will evolve their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'transcribes speech in audio or video files',
  purpose_verb: 'transcribe',
  purpose_word: 'transcribe speech',
  purpose_words: 'Transcribe speech in audio or video files',
  title: 'Transcribe speech in audio or video files',
  typical_file_size_mb: 2.4,
  typical_file_type: 'audio or video file',
  name: 'SpeechTranscribeRobot',
  minimumChargeUsdPerSpeechTranscribeMinute: {
    aws: 0.024,
    gcp: 0.024,
    replicate: 'variable',
  },
}

export const robotSpeechTranscribeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/speech/transcribe').describe(`
You can use the text that we return in your application, or you can pass the text down to other <dfn>Robots</dfn> to filter audio or video files that contain (or do not contain) certain content, or burn the text into images or video for example.

Another common use case is automatically subtitling videos, or making audio searchable.

Set \`speaker_labels\` to \`true\` when you want JSON or meta transcription output to distinguish
recurring speakers:

\`\`\`json
{
  "steps": {
    "transcribed": {
      "use": ":original",
      "robot": "/speech/transcribe",
      "provider": "aws",
      "format": "json",
      "speaker_labels": true,
      "max_speakers": 3
    }
  }
}
\`\`\`

Speaker labels are currently supported by the \`aws\` and \`gcp\` providers. If you enable
\`speaker_labels\` without setting \`provider\`, Transloadit uses \`aws\` for that <dfn>Step</dfn>, or
\`gcp\` when \`vocabulary\` is also supplied. Labels
are normalized as \`speaker_1\`, \`speaker_2\`, and so on:

\`\`\`json
{
  "text": "Hello there. Hi!",
  "words": [
    { "text": "Hello", "startTime": 0, "endTime": 0.5, "speaker": "speaker_1" },
    { "text": "there", "startTime": 0.6, "endTime": 1, "speaker": "speaker_1" },
    { "text": "Hi!", "startTime": 1.2, "endTime": 1.8, "speaker": "speaker_2" }
  ],
  "segments": [
    { "text": "Hello there", "startTime": 0, "endTime": 1, "speaker": "speaker_1" },
    { "text": "Hi!", "startTime": 1.2, "endTime": 1.8, "speaker": "speaker_2" }
  ]
}
\`\`\`
`),
    provider: speechTranscribeProviderSchema.describe(`
${autoProviderDescription}

Set this to \`"aws"\`, \`"gcp"\`, or \`"replicate"\` to force a specific provider.
When set to \`"auto"\`, Transloadit uses \`"replicate"\` by default and uses \`"aws"\` when
\`speaker_labels\` is enabled. If both \`speaker_labels\` and a nonempty \`vocabulary\` are set,
\`"auto"\` uses \`"gcp"\`.
`),
    vocabulary: speechTranscribeVocabularySchema.optional().describe(`
Words or phrases to favor during speech recognition, using the spelling you want in the output.
For example, \`["Transloadit", "Uppy", "tus"]\` helps the provider recognize brand and product names.

Supply up to 50 distinct terms, each between 1 and 100 characters after trimming surrounding
whitespace. Terms must not contain control characters or case-insensitive duplicates. The terms
joined with \`", "\` must fit within 200 UTF-8 bytes, keeping all terms within Whisper’s prompt
budget. Omitting this parameter or supplying an empty array leaves recognition unchanged.

Supported by \`"replicate"\` and \`"gcp"\`. Replicate uses a prompt-capable WhisperX large-v3 model
with aligned word timestamps when vocabulary is supplied. GCP uses inline boosted phrase hints.
Explicit \`"aws"\` requests with vocabulary return a validation error because AWS requires a
pre-created Custom Vocabulary. Use \`"auto"\`, \`"replicate"\`, or \`"gcp"\` instead.

Hints improve recognition but do not guarantee that a term is recognized. Afterwards, complete
case-insensitive matches use your supplied spelling in every output format, including JSON words
and speaker segments, without changing timestamps. Similar-sounding words are never replaced:
\`"transloadit"\` becomes \`"Transloadit"\`, but \`"Transloaded"\` stays unchanged.
`),
    granularity: granularitySchema.describe(`
Both \`"full"\` and \`"list"\` currently return the same complete transcription response. \`"list"\` remains accepted for backward compatibility.
`),
    format: z
      .enum(['json', 'meta', 'srt', 'text', 'webvtt'])
      .default('json')
      .describe(`
Output format for the transcription.

- \`"text"\` outputs a plain text file that you can store and process.
- \`"json"\` outputs a JSON file containing timestamped words. When \`speaker_labels\` is enabled, words can include \`speaker\` labels and the JSON can also include grouped \`segments\` by speaker.
- \`"srt"\` and \`"webvtt"\` output subtitle files of those respective file types, which can be stored separately or used in other encoding <dfn>Steps</dfn>.
- \`"meta"\` does not return a file, but stores the data inside Transloadit's file object (under \`\${file.meta.transcription.text}\`, \`\${file.meta.transcription.words}\`, and, when speaker labels are available, \`\${file.meta.transcription.segments}\`) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to burn the data into videos, filter on them, etc.
`),
    speaker_labels: z
      .boolean()
      .default(false)
      .describe(`
When enabled, Transloadit asks the transcription provider to distinguish different speakers. JSON and meta output can then include \`speaker\` labels such as \`"speaker_1"\` on individual words, plus grouped \`segments\` by speaker. Text, SRT, and WebVTT output behavior is unchanged.

Speaker labels identify recurring voices, not real person names. Accuracy depends on audio quality, background noise, overlapping speech, and the number of speakers.
`),
    max_speakers: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(10)
      .describe(`
The maximum number of speakers to detect when \`speaker_labels\` is enabled.
`),
    // TODO determine the list of languages
    source_language: z
      .string()
      .default('en-US')
      .describe(`
Sets the spoken language for the \`"aws"\` and \`"gcp"\` providers. The transcription stays in the spoken language; this parameter does not translate speech.

The language should be specified in the [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) format, such as \`"en-GB"\`, \`"de-DE"\` or \`"fr-FR"\`. Please also consult the list of supported languages for [the \`gcp\` provider](https://cloud.google.com/speech-to-text/docs/languages) and [the \`aws\` provider](https://docs.aws.amazon.com/transcribe/latest/dg/what-is-transcribe.html).
`),
    // TODO determine the list of languages
    target_language: z
      .string()
      .optional()
      .describe(`
Sets the spoken language hint for the \`"replicate"\` provider. Omit this parameter to detect the spoken language automatically. Set it to the full lowercase English language name, such as \`"french"\`, when the spoken language is known. Despite its name, this parameter does not translate speech.

For the \`"aws"\` and \`"gcp"\` providers, use \`source_language\` instead.
`),
  })
  .strict()

const hiddenFields = {
  model: z.enum(['whisper-large-v3']).optional(),
  provider: speechTranscribeProviderWithHiddenFieldsSchema,
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotSpeechTranscribeInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotSpeechTranscribeInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSpeechTranscribeInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSpeechTranscribeInstructions = Instructions['output']
export type RobotSpeechTranscribeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSpeechTranscribeInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSpeechTranscribeInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
