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
      translated: {
        robot: '/text/translate',
        use: ':original',
        target_language: 'de',
        provider: 'aws',
      },
    },
  },
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
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'translates text in documents',
  purpose_verb: 'translate',
  purpose_word: 'text',
  purpose_words: 'Translate text in documents',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Translate text',
  typical_file_size_mb: 1,
  typical_file_type: 'document',
  name: 'TextTranslateRobot',
  priceFactor: 0.00008,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
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
    provider: aiProviderSchema.describe(`
Which AI provider to leverage. Valid values are \`"aws"\` (Amazon Web Services) and \`"gcp"\` (Google Cloud Platform).

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
`),
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

export const robotTextTranslateInstructionsWithHiddenFieldsSchema =
  robotTextTranslateInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTextTranslateInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTextTranslateInstructions = z.infer<typeof robotTextTranslateInstructionsSchema>
export type RobotTextTranslateInstructionsWithHiddenFields = z.infer<
  typeof robotTextTranslateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTextTranslateInstructionsSchema = interpolateRobot(
  robotTextTranslateInstructionsSchema,
)
export type InterpolatableRobotTextTranslateInstructions =
  InterpolatableRobotTextTranslateInstructionsInput

export type InterpolatableRobotTextTranslateInstructionsInput = z.input<
  typeof interpolatableRobotTextTranslateInstructionsSchema
>

export const interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotTextTranslateInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotTextTranslateInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotTextTranslateInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema
>
