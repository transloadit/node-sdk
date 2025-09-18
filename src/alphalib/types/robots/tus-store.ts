import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      exported: {
        robot: '/tus/store',
        use: ':original',
        endpoint: 'https://tusd.tusdemo.net/files/',
      },
    },
  },
  example_code_description: 'Export uploaded files to the Tus live demo server:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to any Tus-compatible server',
  purpose_verb: 'export',
  purpose_word: 'Tus servers',
  purpose_words: 'Export files to Tus-compatible servers',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Tus-compatible servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'TusStoreRobot',
  priceFactor: 10,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotTusStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/tus/store').describe(`
> [!Note]
> This <dfn>Robot</dfn> only accepts videos.

> [!Warning]
> Vimeo's API limits the number of concurrent uploads per minute based on your Vimeo account plan. To see how many videos can be uploaded at once based on your plan, click the following [link](https://developer.vimeo.com/guidelines/rate-limiting#table-1).

## Installation

Since Vimeo works with OAuth, you will need to generate [Template Credentials](https://transloadit.com/c/template-credentials/) to use this <dfn>Robot</dfn>.

To change the \`title\` or \`description\` per video, we recommend to [inject variables into your Template](/docs/topics/templates/).
`),
    endpoint: z
      .string()
      .url()
      .describe('The URL of the destination Tus server')
      .describe(`
The URL of the Tus-compatible server, which you're uploading files to.
`),
    credentials: z
      .string()
      .optional()
      .describe(`
Create <dfn>Template Credentials</dfn> for this <dfn>Robot</dfn> in your [Transloadit account](/c/template-credentials/) and use the name of the <dfn>Template Credentials</dfn> as this parameter's value. For this <dfn>Robot</dfn>, use the HTTP template, which allows request headers to be passed along to the destination server.
`),
    headers: z
      .record(z.string())
      .default({})
      .describe('Headers to pass along to destination')
      .describe(`
Optional extra headers outside of the <dfn>Template Credentials</dfn> can be passed along within this parameter.

Although, we recommend to exclusively use <dfn>Template Credentials</dfn>, this may be necessary if you're looking to use dynamic credentials, which isn't a feature supported by <dfn>Template Credentials</dfn>.
`),
    metadata: z
      .record(z.string())
      .default({ filename: 'example.png', basename: 'example', extension: 'png' })
      .describe(`
Metadata to pass along to destination. Includes some file info by default.
`),
    url_template: z
      .string()
      .optional()
      .describe(`
The URL of the file in the <dfn>Assembly Status JSON</dfn>. The following [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables) are supported. If this is not specified, the upload URL specified by the destination server will be used instead.
`),
    ssl_url_template: z
      .string()
      .optional()
      .describe(`
The SSL URL of the file in the <dfn>Assembly Status JSON</dfn>. The following [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables) are supported. If this is not specified, the upload URL specified by the destination server will be used instead, as long as it starts with \`https\`.
`),
  })
  .strict()

export const robotTusStoreInstructionsWithHiddenFieldsSchema =
  robotTusStoreInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotTusStoreInstructionsSchema.shape.result]).optional(),
  })

export type RobotTusStoreInstructions = z.infer<typeof robotTusStoreInstructionsSchema>
export type RobotTusStoreInstructionsWithHiddenFields = z.infer<
  typeof robotTusStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTusStoreInstructionsSchema = interpolateRobot(
  robotTusStoreInstructionsSchema,
)
export type InterpolatableRobotTusStoreInstructions = InterpolatableRobotTusStoreInstructionsInput

export type InterpolatableRobotTusStoreInstructionsInput = z.input<
  typeof interpolatableRobotTusStoreInstructionsSchema
>

export const interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotTusStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotTusStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotTusStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema
>
