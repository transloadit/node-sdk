import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  aiProviderSchema,
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
      synthesized: {
        robot: '/text/speak',
        use: ':original',
        provider: 'aws',
        voice: 'female-1',
        target_language: 'en-US',
      },
    },
  },
  example_code_description:
    'Synthesize speech from uploaded text documents, using a female voice in American English:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.

## Supported languages and voices

{% for provider in text_speak_voices %}

### {{provider[0] | upcase }}

<table class="table">
  <thead>
    <tr>
      <th>Language</th>
      <th>Voices</th>
    </tr>
  </thead>
  <tbody>
    {%- for language in provider[1] %}
      <tr>
        <td><strong>{{language[0]}}</strong></td>
        <td>{{ language[1] | join: ", " }}</td>
      </tr>
    {%- endfor %}
  </tbody>
</table>
{% endfor %}
`,
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'synthesizes speech in documents',
  purpose_verb: 'speak',
  purpose_word: 'synthesize speech',
  purpose_words: 'Synthesize speech in documents',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Speak text',
  typical_file_size_mb: 1,
  typical_file_type: 'document',
  name: 'TextSpeakRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.05,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotTextSpeakInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/text/speak').describe(`
You can use the audio that we return in your application, or you can pass the audio down to other <dfn>Robots</dfn> to add a voice track to a video for example.

Another common use case is making your product accessible to people with a reading disability.
`),
    prompt: z
      .string()
      .nullish()
      .describe(`
Which text to speak. You can also set this to \`null\` and supply an input text file.
`),
    provider: aiProviderSchema.describe(`
Which AI provider to leverage.

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
`),
    // TODO determine the list of languages
    target_language: z
      .string()
      .default('en-US')
      .describe(`
The written language of the document. This will also be the language of the spoken text.

The language should be specified in the [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) format, such as \`"en-GB"\`, \`"de-DE"\` or \`"fr-FR"\`. Please consult the list of supported languages and voices.
`),
    voice: z
      .enum(['female-1', 'female-2', 'female-3', 'female-child-1', 'male-1', 'male-child-1'])
      .default('female-1')
      .describe(`
The gender to be used for voice synthesis. Please consult the list of supported languages and voices.
      `),
    ssml: z
      .boolean()
      .default(false)
      .describe(`
Supply [Speech Synthesis Markup Language](https://en.wikipedia.org/wiki/Speech_Synthesis_Markup_Language) instead of raw text, in order to gain more control over how your text is voiced, including rests and pronounciations.

Please see the supported syntaxes for [AWS](https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html) and [GCP](https://cloud.google.com/text-to-speech/docs/ssml).
`),
  })
  .strict()

export const robotTextSpeakInstructionsWithHiddenFieldsSchema =
  robotTextSpeakInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotTextSpeakInstructionsSchema.shape.result]).optional(),
  })

export type RobotTextSpeakInstructions = z.infer<typeof robotTextSpeakInstructionsSchema>
export type RobotTextSpeakInstructionsWithHiddenFields = z.infer<
  typeof robotTextSpeakInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTextSpeakInstructionsSchema = interpolateRobot(
  robotTextSpeakInstructionsSchema,
)
export type InterpolatableRobotTextSpeakInstructions = InterpolatableRobotTextSpeakInstructionsInput

export type InterpolatableRobotTextSpeakInstructionsInput = z.input<
  typeof interpolatableRobotTextSpeakInstructionsSchema
>

export const interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotTextSpeakInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotTextSpeakInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotTextSpeakInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema
>
