import { z } from 'zod'

import { interpolateRobot, type RobotMetaInput, robotBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 20,
  discount_factor: 0.05,
  discount_pct: 95,
  minimum_charge: 102400,
  output_factor: 1,
  override_lvl1: 'Content Delivery',
  purpose_sentence: 'caches and delivers files globally',
  purpose_verb: 'cache & deliver',
  purpose_word: 'Cache and deliver files',
  purpose_words: 'Cache and deliver files globally',
  service_slug: 'content-delivery',
  slot_count: 0,
  title: 'Cache and deliver files globally',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'EdglyDeliverRobot',
  priceFactor: 20,
  queueSlotCount: 0,
  minimumCharge: 102400,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: false,
  isInternal: true,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotEdglyDeliverInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/edgly/deliver').describe(`
When you want Transloadit to tranform files on the fly, this <dfn>Robot</dfn> can cache and deliver the results close to your end-user, saving on latency and encoding volume. The use of this <dfn>Robot</dfn> is implicit when you use the <code>edgly.net</code> domain.
`),
  })
  .strict()

export const robotEdglyDeliverInstructionsWithHiddenFieldsSchema =
  robotEdglyDeliverInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotEdglyDeliverInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotEdglyDeliverInstructions = z.infer<typeof robotEdglyDeliverInstructionsSchema>
export type RobotEdglyDeliverInstructionsWithHiddenFields = z.infer<
  typeof robotEdglyDeliverInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotEdglyDeliverInstructionsSchema = interpolateRobot(
  robotEdglyDeliverInstructionsSchema,
)
export type InterpolatableRobotEdglyDeliverInstructions =
  InterpolatableRobotEdglyDeliverInstructionsInput

export type InterpolatableRobotEdglyDeliverInstructionsInput = z.input<
  typeof interpolatableRobotEdglyDeliverInstructionsSchema
>

export const interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotEdglyDeliverInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotEdglyDeliverInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema
>
