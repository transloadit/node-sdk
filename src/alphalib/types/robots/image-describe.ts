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
      described: {
        robot: '/image/describe',
        use: ':original',
        provider: 'aws',
      },
    },
  },
  example_code_description:
    'Recognize objects in an uploaded image and store the labels in a JSON file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input images. Avoid relying on exact responses in your tests and application.
`,
  minimum_charge: 1572864,
  output_factor: 0.05,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'recognizes objects in images and returns them as English words',
  purpose_verb: 'recognize',
  purpose_word: 'recognize objects',
  purpose_words: 'Recognize objects in images',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Recognize objects in images',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
  name: 'ImageDescribeRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.0013,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageDescribeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/describe').describe(`
You can use the labels that we return in your application to automatically classify images. You can also pass the labels down to other <dfn>Robots</dfn> to filter images that contain (or do not contain) certain content.
`),
    provider: aiProviderSchema.optional().describe(`
Which AI provider to leverage.

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
`),
    granularity: granularitySchema.describe(`
Whether to return a full response (\`"full"\`) including confidence percentages for each found label, or just a flat list of labels (\`"list"\`).
`),
    format: z
      .enum(['json', 'meta', 'text'])
      .default('json')
      .describe(`
In what format to return the descriptions.

- \`"json"\` returns a JSON file.
- \`"meta"\` does not return a file, but stores the data inside Transloadit's file object (under \`\${file.meta.descriptions}\`) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to burn the data into videos, filter on them, etc.
`),
    explicit_descriptions: z
      .boolean()
      .default(false)
      .describe(`
Whether to return only explicit or only non-explicit descriptions of the provided image. Explicit descriptions include labels for NSFW content (nudity, violence, etc). If set to \`false\`, only non-explicit descriptions (such as human or chair) will be returned. If set to \`true\`, only explicit descriptions will be returned.

The possible descriptions depend on the chosen provider. The list of labels from AWS can be found [in their documentation](https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html#moderation-api). GCP labels the image based on five categories, as described [in their documentation](https://cloud.google.com/vision/docs/detecting-safe-search).

For an example of how to automatically reject NSFW content and malware, please check out this [blog post](/blog/2022/07/deny-image-uploads/).
`),
  })
  .strict()

export const robotImageDescribeInstructionsWithHiddenFieldsSchema =
  robotImageDescribeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotImageDescribeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageDescribeInstructions = z.infer<typeof robotImageDescribeInstructionsSchema>
export type RobotImageDescribeInstructionsWithHiddenFields = z.infer<
  typeof robotImageDescribeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageDescribeInstructionsSchema = interpolateRobot(
  robotImageDescribeInstructionsSchema,
)
export type InterpolatableRobotImageDescribeInstructions =
  InterpolatableRobotImageDescribeInstructionsInput

export type InterpolatableRobotImageDescribeInstructionsInput = z.input<
  typeof interpolatableRobotImageDescribeInstructionsSchema
>

export const interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageDescribeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageDescribeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema
>
