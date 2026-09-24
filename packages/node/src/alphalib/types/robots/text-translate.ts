import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  awsGcpAiProviderSchema,
  createProcessingExample,
  defineRobot,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('translated', '/text/translate', {
    target_language: 'de',
    provider: 'aws',
  }),
  example_code_description: 'Translate uploaded text file contents to German:',
  extended_description: `
> [!Warning]
> This <dfn>Robot</dfn> uses third-party AI services. They may tweak their models over time, giving different responses for the same input media. Avoid relying on exact responses in your tests and application.

## Supported languages

{%- for provider in text_translate_languages %}

### {{provider[0] | upcase }}

<!-- prettier-ignore -->
{%- for language in provider[1] %}
  {{ language }}{% unless forloop.last %},{% endunless %}
{%- endfor %}

{%- endfor %}
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'translates text in documents',
  purpose_verb: 'translate',
  purpose_word: 'text',
  purpose_words: 'Translate text in documents',
  title: 'Translate text',
  typical_file_size_mb: 1,
  typical_file_type: 'document',
  name: 'TextTranslateRobot',
  priceFactor: 0.00008,
}

const translatableLanguages = z
  .enum([
    'af',
    'am',
    'ar',
    'az',
    'be',
    'bg',
    'bn',
    'bs',
    'ca',
    'ceb',
    'co',
    'cs',
    'cy',
    'da',
    'de',
    'el',
    'en',
    'en-US',
    'eo',
    'es',
    'es-MX',
    'et',
    'eu',
    'fa',
    'fa-AF',
    'fi',
    'fr',
    'fr-CA',
    'fy',
    'ga',
    'gd',
    'gl',
    'gu',
    'ha',
    'haw',
    'he',
    'hi',
    'hmn',
    'hr',
    'ht',
    'hu',
    'hy',
    'id',
    'ig',
    'is',
    'it',
    'iw',
    'ja',
    'jv',
    'ka',
    'kk',
    'km',
    'kn',
    'ko',
    'ku',
    'ky',
    'la',
    'lb',
    'lo',
    'lt',
    'lv',
    'mg',
    'mi',
    'mk',
    'ml',
    'mn',
    'mr',
    'ms',
    'mt',
    'my',
    'ne',
    'nl',
    'no',
    'ny',
    'or',
    'pa',
    'pl',
    'ps',
    'pt',
    'ro',
    'ru',
    'rw',
    'sd',
    'si',
    'sk',
    'sl',
    'sm',
    'sn',
    'so',
    'sq',
    'sr',
    'st',
    'su',
    'sv',
    'sw',
    'ta',
    'te',
    'tg',
    'th',
    'tk',
    'tl',
    'tr',
    'tt',
    'ug',
    'uk',
    'ur',
    'uz',
    'vi',
    'xh',
    'yi',
    'yo',
    'zh',
    'zh-CN',
    'zh-TW',
    'zu',
  ])
  .default('en')

export const robotTextTranslateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/text/translate').describe(`
You can use the text that we return in your application, or you can pass the text down to other <dfn>Robots</dfn> to add a translated subtitle track to a video for example.

> [!Note]
> **This <dfn>Robot</dfn> accepts only files with a \`text/*\` MIME-type,** including plain text and Markdown. For documents in other formats, use [🤖/document/convert](/docs/robots/document-convert/) to first convert them into a compatible text format before proceeding.
`),
    provider: awsGcpAiProviderSchema.describe(robotParameterDocs.ai_provider.description),
    target_language: translatableLanguages.describe(`
The desired language to translate to.

If the exact language can't be found, a generic variant can be fallen back to. For example, if you specify \`"en-US"\`, "en" will be used instead. Please consult the list of supported languages for each provider.
`),
    source_language: translatableLanguages.describe(`
The desired language to translate from.

By default, both providers will detect this automatically, but there are cases where specifying the source language prevents ambiguities.

If the exact language can't be found, a generic variant can be fallen back to. For example, if you specify \`"en-US"\`, "en" will be used instead. Please consult the list of supported languages for each provider.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotTextTranslateInstructionsSchema.shape> =
  defineRobot(meta, robotTextTranslateInstructionsSchema)

export const {
  withHiddenFields: robotTextTranslateInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTextTranslateInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTextTranslateInstructions = Instructions['output']
export type RobotTextTranslateInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTextTranslateInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTextTranslateInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTextTranslateInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTextTranslateInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
