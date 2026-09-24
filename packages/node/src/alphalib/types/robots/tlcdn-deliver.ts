import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { defineRobot, robotBase, robotContentDeliveryMeta } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotContentDeliveryMeta,
  example_code: {
    steps: {
      deliver: {
        robot: '/tlcdn/deliver',
      },
    },
  },
  example_code_description: 'Cache and deliver files over Smart CDN using the tlcdn.com domain:',
  override_lvl1: 'Content Delivery',
  purpose_sentence: 'caches and delivers files globally',
  purpose_verb: 'cache & deliver',
  purpose_word: 'Cache and deliver files',
  purpose_words: 'Cache and deliver files globally',
  title: 'Cache and deliver files globally',
  name: 'TlcdnDeliverRobot',
  // Baseline factor for non-HIPAA delivery; HIPAA delivery uses a 20% lower factor.
  priceFactor: 25,
  minimumCharge: 102400,
  minimumChargeUsd: 0.0000152587890625,
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

export const robotDefinition: RobotDefinition<typeof robotTlcdnDeliverInstructionsSchema.shape> =
  defineRobot(meta, robotTlcdnDeliverInstructionsSchema)

export const {
  withHiddenFields: robotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTlcdnDeliverInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTlcdnDeliverInstructions = Instructions['output']
export type RobotTlcdnDeliverInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTlcdnDeliverInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTlcdnDeliverInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
