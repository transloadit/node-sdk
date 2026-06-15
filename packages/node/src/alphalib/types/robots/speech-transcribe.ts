import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  granularitySchema,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

const speechTranscribeProviderSchema = z.enum(['aws', 'gcp', 'replicate']).optional()
const speechTranscribeProviderWithHiddenFieldsSchema = z
  .enum(['aws', 'gcp', 'replicate', 'transloadit'])
  .optional()

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      transcribed: {
        robot: '/speech/transcribe',
        use: ':original',
        provider: 'replicate',
        source_language: 'fr-FR',
        format: 'text',
      },
    },
  },
  example_code_description:
    'Transcribe speech in French from uploaded audio or video, and save it to a text file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses AI services. The providers will evolve their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.
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
  stage: 'ga',
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
\`speaker_labels\` without setting \`provider\`, Transloadit uses \`aws\` for that <dfn>Step</dfn>. Labels
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
Which AI provider to leverage.

Defaults to \`"replicate"\`, which currently uses our highest-quality deployed transcription path while ElevenLabs Scribe support is being prepared. When \`speaker_labels\` is \`true\` and \`provider\` is omitted, Transloadit defaults to \`"aws"\`, because speaker labels are currently supported by the \`aws\` and \`gcp\` providers.

Transloadit abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
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
    model: z.enum(['whisper-large-v3']).optional(),
    provider: speechTranscribeProviderWithHiddenFieldsSchema,
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
