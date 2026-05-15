import { z } from 'zod'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 25,
  discount_factor: 0.04,
  discount_pct: 96,
  example_code: {
    steps: {
      deliver: {
        robot: '/tlcdn/deliver',
      },
    },
  },
  example_code_description: 'Cache and deliver files over Smart CDN using the tlcdn.com domain:',
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
  name: 'TlcdnDeliverRobot',
  // Baseline factor for non-HIPAA delivery; HIPAA delivery uses a 20% lower factor.
  priceFactor: 25,
  queueSlotCount: 0,
  minimumCharge: 102400,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: false,
  isInternal: true,
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotTlcdnDeliverInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/tlcdn/deliver').describe(`
When you want Transloadit to transform files on the fly, this <dfn>Robot</dfn> can cache and deliver the results close to your end-user, saving on latency and encoding volume. The use of this <dfn>Robot</dfn> is implicit when you use the <code>tlcdn.com</code> domain.
`),
    enable_hipaa_compliance: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When enabled, use the HIPAA-compliant Smart CDN pricing profile for this delivery step (20% lower price factor). When disabled, the non-HIPAA baseline price factor applies.',
      ),
  })
  .strict()

export const robotTlcdnDeliverInstructionsWithHiddenFieldsSchema =
  robotTlcdnDeliverInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTlcdnDeliverInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTlcdnDeliverInstructions = z.infer<typeof robotTlcdnDeliverInstructionsSchema>
export type RobotTlcdnDeliverInstructionsWithHiddenFields = z.infer<
  typeof robotTlcdnDeliverInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTlcdnDeliverInstructionsSchema = interpolateRobot(
  robotTlcdnDeliverInstructionsSchema,
)
export type InterpolatableRobotTlcdnDeliverInstructions =
  InterpolatableRobotTlcdnDeliverInstructionsInput

export type InterpolatableRobotTlcdnDeliverInstructionsInput = z.input<
  typeof interpolatableRobotTlcdnDeliverInstructionsSchema
>

export const interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema
>
