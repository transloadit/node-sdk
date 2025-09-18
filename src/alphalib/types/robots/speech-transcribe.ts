import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  aiProviderSchema,
  granularitySchema,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      transcribed: {
        robot: '/speech/transcribe',
        use: ':original',
        provider: 'aws',
        source_language: 'fr-FR',
        format: 'text',
      },
    },
  },
  example_code_description:
    'Transcribe speech in French from uploaded audio or video, and save it to a text file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.
`,
  minimum_charge: 1048576,
  output_factor: 0.05,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'transcribes speech in audio or video files',
  purpose_verb: 'transcribe',
  purpose_word: 'transcribe speech',
  purpose_words: 'Transcribe speech in audio or video files',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Transcribe speech in audio or video files',
  typical_file_size_mb: 2.4,
  typical_file_type: 'audio or video file',
  name: 'SpeechTranscribeRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsdPerSpeechTranscribeMinute: {
    aws: 0.024,
    gcp: 0.016,
  },
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotSpeechTranscribeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/speech/transcribe').describe(`
You can use the text that we return in your application, or you can pass the text down to other <dfn>Robots</dfn> to filter audio or video files that contain (or do not contain) certain content, or burn the text into images or video for example.

Another common use case is automatically subtitling videos, or making audio searchable.
`),
    provider: aiProviderSchema.describe(`
Which AI provider to leverage.

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
`),
    granularity: granularitySchema.describe(`
Whether to return a full response (\`"full"\`), or a flat list of descriptions (\`"list"\`).
`),
    format: z
      .enum(['json', 'meta', 'srt', 'meta', 'text', 'webvtt'])
      .default('json')
      .describe(`
Output format for the transcription.

- \`"text"\` outputs a plain text file that you can store and process.
- \`"json"\` outputs a JSON file containing timestamped words.
- \`"srt"\` and \`"webvtt"\` output subtitle files of those respective file types, which can be stored separately or used in other encoding <dfn>Steps</dfn>.
- \`"meta"\` does not return a file, but stores the data inside  Transloadit's file object (under \`\${file.meta.transcription.text}\`) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to burn the data into videos, filter on them, etc.
`),
    // TODO determine the list of languages
    source_language: z
      .string()
      .default('en-US')
      .describe(`
The spoken language of the audio or video. This will also be the language of the transcribed text.

The language should be specified in the [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) format, such as \`"en-GB"\`, \`"de-DE"\` or \`"fr-FR"\`. Please also consult the list of supported languages for [the \`gcp\` provider](https://cloud.google.com/speech-to-text/docs/languages) and the [the \`aws\` provider](https://docs.aws.amazon.com/transcribe/latest/dg/what-is-transcribe.html).
`),
    // TODO determine the list of languages
    target_language: z
      .string()
      .default('en-US')
      .describe(`
      This will also be the language of the written text.

      The language should be specified in the [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) format, such as \`"en-GB"\`, \`"de-DE"\` or \`"fr-FR"\`. Please consult the list of supported languages and voices.
    `),
  })
  .strict()

export const robotSpeechTranscribeInstructionsWithHiddenFieldsSchema =
  robotSpeechTranscribeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotSpeechTranscribeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotSpeechTranscribeInstructions = z.infer<
  typeof robotSpeechTranscribeInstructionsSchema
>
export type RobotSpeechTranscribeInstructionsWithHiddenFields = z.infer<
  typeof robotSpeechTranscribeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotSpeechTranscribeInstructionsSchema = interpolateRobot(
  robotSpeechTranscribeInstructionsSchema,
)
export type InterpolatableRobotSpeechTranscribeInstructions =
  InterpolatableRobotSpeechTranscribeInstructionsInput

export type InterpolatableRobotSpeechTranscribeInstructionsInput = z.input<
  typeof interpolatableRobotSpeechTranscribeInstructionsSchema
>

export const interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotSpeechTranscribeInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema
>
