import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('copyright_checked', '/image/copyrightdetect', {
    confidence_threshold: 80,
    error_on_decline: true,
    error_msg: 'This image appears to be a known stock photo. Please upload original content.',
  }),
  example_code_description:
    'Detect known stock photos and copyrighted works in uploaded images and reject flagged files:',
  extended_description: `
> [!Note]
> This <dfn>Robot</dfn> detects **known stock photos, brand logos, and watermarked images** by performing reverse image lookups against web databases. It is best understood as "stock photo detection" — it tells you if an uploaded image matches a known copyrighted work in indexed databases (Getty Images, Shutterstock, Adobe Stock, etc.), not whether an image is copyrighted in the legal sense (since technically all photos are copyrighted by their creator).

> [!Warning]
> This <dfn>Robot</dfn> provides a **risk signal**, not a legal determination. Results should be interpreted as "potentially copyrighted" — never as definitive proof of infringement. Copyright law varies by jurisdiction and the system cannot know if a user holds a valid license. We recommend using this Robot as one input in a broader content moderation workflow.

> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers will evolve their models over time, giving different responses for the same input images. Avoid relying on exact responses in your tests and application.

> [!Tip]
> If you want to keep only files below your confidence threshold (for example keep 20 out of 100), set \`format\` to \`"meta"\` and add a [🤖/file/filter](/docs/robots/file-filter/) Step after this one:
>
> ~~~json
> {
>   "steps": {
>     "copyright_scan": {
>       "robot": "/image/copyrightdetect",
>       "use": ":original",
>       "format": "meta",
>       "confidence_threshold": 80,
>       "error_on_decline": false
>     },
>     "keep_safe": {
>       "robot": "/file/filter",
>       "use": "copyright_scan",
>       "declines": "\${file.meta.copyright?.flagged === true}"
>     }
>   }
> }
> ~~~
>
> In this setup, files with at least one match at or above your threshold are declined, and only the remaining files continue to later Steps.
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence:
    'detects known stock photos, brand logos, and watermarked images in uploaded files using reverse image search',
  purpose_verb: 'detect',
  purpose_word: 'detect stock photos and copyrighted works',
  purpose_words: 'Detect known stock photos and copyrighted works in images',
  title: 'Detect known stock photos and copyrighted works in images',
  typical_file_size_mb: 0.8,
  name: 'ImageCopyrightdetectRobot',
  minimumChargeUsd: 0.0013,
  stage: 'alpha',
}

export const robotImageCopyrightdetectInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/copyrightdetect').describe(`
Detects known stock photos, brand logos, and watermarked images in uploaded files by performing reverse image lookups against web databases. This is best understood as "stock photo detection" — it identifies whether an uploaded image matches a known copyrighted work in indexed databases (Getty Images, Shutterstock, Adobe Stock, etc.).

Returns a \`licenses[]\` array with match details including source collection, license type, confidence scores, and source URLs. Can optionally halt the <dfn>Assembly</dfn> when a known copyrighted work is detected, similar to how \`/file/virusscan\` handles malicious files.

This <dfn>Robot</dfn> provides a **risk signal**, not a legal determination. A match means the image was found in a stock photo or rights-managed database — it does not mean the user lacks a valid license.
`),
    confidence_threshold: z
      .number()
      .min(0)
      .max(100)
      .default(80)
      .describe(`
Minimum confidence percentage (0\u2013100) for a match to be considered a copyright concern. Matches below this threshold are still returned in results but not flagged. Higher values reduce false positives but may miss some matches.
`),
    categories: z
      .array(z.enum(['stock_photo', 'brand_logo', 'artwork', 'watermarked', 'all']))
      .nonempty()
      .default(['all'])
      .describe(`
Which categories of copyrighted content to detect.

- \`"stock_photo"\` \u2014 Known stock photography (Shutterstock, Getty, Adobe Stock, etc.)
- \`"brand_logo"\` \u2014 Registered brand logos and trademarks
- \`"artwork"\` \u2014 Famous artworks and illustrations
- \`"watermarked"\` \u2014 Images containing visible watermarks
- \`"all"\` \u2014 All categories
`),
    error_on_decline: z
      .boolean()
      .default(false)
      .describe(`
If set to \`true\` and one or more files match a known stock photo or copyrighted work (above the \`confidence_threshold\`), the <dfn>Assembly</dfn> will be stopped and marked with an error. Works the same way as \`/file/virusscan\`'s \`error_on_decline\`.
`),
    error_msg: z
      .string()
      .default('One of your files matched a known stock photo or copyrighted work')
      .describe(`
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`),
    format: z
      .enum(['json', 'meta'])
      .default('json')
      .describe(`
In what format to return the detection results.

- \`"json"\` returns a JSON file with full match details including \`licenses[]\`, plus summary fields \`flagged\`, \`max_confidence\`, and \`confidence_threshold\`.
- \`"meta"\` does not return a file, but stores the same data object (including \`licenses[]\`, \`flagged\`, \`max_confidence\`, and \`confidence_threshold\`) inside Transloadit's file object (under \`\${file.meta.copyright}\`) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to filter on them, etc.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotImageCopyrightdetectInstructionsSchema.shape
> = defineRobot(meta, robotImageCopyrightdetectInstructionsSchema)

export const {
  withHiddenFields: robotImageCopyrightdetectInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageCopyrightdetectInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotImageCopyrightdetectInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageCopyrightdetectInstructions = Instructions['output']
export type RobotImageCopyrightdetectInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageCopyrightdetectInstructions =
  Instructions['interpolatableInput']
export type InterpolatableRobotImageCopyrightdetectInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotImageCopyrightdetectInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageCopyrightdetectInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
