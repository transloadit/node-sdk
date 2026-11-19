import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('synthesized', '/text/speak', {
    provider: 'aws',
    voice: 'female-1',
    target_language: 'en-US',
  }),
  example_code_description:
    'Synthesize speech from uploaded text documents, using a female voice in American English:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP, ElevenLabs) will evolve their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.

### Using ElevenLabs

Set \`provider\` to \`"elevenlabs"\` for ElevenLabs’ Multilingual v2 voices
(\`eleven_multilingual_v2\`), pinned so the output does not change under you. Every supported
language offers the \`female-1\` and \`male-1\` voices, each mapped to a voice that ElevenLabs
keeps available long-term. They speak the language of your text: ElevenLabs detects it, so
\`target_language\` only selects among the supported languages and cannot steer the pronunciation
of ambiguous words. ElevenLabs reads plain text only, so \`ssml\` must stay \`false\`, and it
speaks at most the first 10,000 characters.

For production, we recommend using your own ElevenLabs account. Store your key as
\`elevenlabs_api_key\` in a Template Credential of the AI Providers type and reference it with
\`credentials\`. With your own account, you have your own ElevenLabs limits and credits.
ElevenLabs bills you directly, and Transloadit charges only its fee: 30% of ElevenLabs’ list price
of $0.08 per 1,000 characters, at least $0.0005 per <dfn>Step</dfn>.

Transloadit’s shared ElevenLabs account is the default and a quick way to try things out.
Its credits and capacity are shared by all customers, so your <dfn>Step</dfn> can be delayed or
refused for reasons outside your control. With this account, Transloadit bills ElevenLabs’
list price of $0.08 per 1,000 characters plus a 30% fee, at least $0.05 per <dfn>Step</dfn>.

With either account, Transloadit retries HTTP 429 limit responses up to twice; if the limit
persists, the <dfn>Step</dfn> fails. Exhausted credits fail without retrying. When the <dfn>Step</dfn>’s
regular data volume charge is higher than the pricing above, that applies instead. If ElevenLabs
rejects your key, the <dfn>Step</dfn> fails; Transloadit never falls back to its own key.
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'synthesizes speech in documents',
  purpose_verb: 'speak',
  purpose_word: 'synthesize speech',
  purpose_words: 'Synthesize speech in documents',
  title: 'Speak text',
  typical_file_size_mb: 1,
  typical_file_type: 'document',
  name: 'TextSpeakRobot',
  minimumChargeUsd: 0.05,
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
    provider: z
      .enum(['auto', 'aws', 'elevenlabs', 'gcp'])
      .default('auto')
      .describe(
        `${robotParameterDocs.ai_provider.description} \`"auto"\` uses \`"aws"\` and never selects \`"elevenlabs"\`.`,
      ),
    credentials: z
      .string()
      .optional()
      .describe(`
The name of a Template Credential of the AI Providers type that holds your own
\`elevenlabs_api_key\`. Only the \`"elevenlabs"\` provider uses it.
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

Please see the supported syntaxes for [AWS](https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html) and [GCP](https://cloud.google.com/text-to-speech/docs/ssml). The \`"elevenlabs"\` provider does not accept SSML.
`),
  })
  .strict()

const hiddenFields = {
  // Injected from the Template Credential named in `credentials`. A shared AI Providers credential
  // also injects other providers' keys; the Robot's runtime validation ignores them, so only the
  // schema observer notices, and listing every AI key here would document fields we never use.
  elevenlabs_api_key: z.string().optional(),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotTextSpeakInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotTextSpeakInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotTextSpeakInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTextSpeakInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTextSpeakInstructions = Instructions['output']
export type RobotTextSpeakInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTextSpeakInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTextSpeakInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTextSpeakInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTextSpeakInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
