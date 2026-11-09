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
        robot: '/edgly/deliver',
      },
    },
  },
  example_code_description: 'Cache and deliver files over Smart CDN using the edgly.net domain:',
  override_lvl1: 'Content Delivery',
  purpose_sentence: 'caches and delivers files globally',
  purpose_verb: 'cache & deliver',
  purpose_word: 'Cache and deliver files',
  purpose_words: 'Cache and deliver files globally',
  title: 'Cache and deliver files globally',
  name: 'EdglyDeliverRobot',
  priceFactor: 20,
  minimumCharge: 102400,
  stage: 'removed',
}

export const robotEdglyDeliverInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/edgly/deliver').describe(`
When you want Transloadit to tranform files on the fly, this <dfn>Robot</dfn> can cache and deliver the results close to your end-user, saving on latency and encoding volume. The use of this <dfn>Robot</dfn> is implicit when you use the <code>edgly.net</code> domain.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotEdglyDeliverInstructionsSchema.shape> =
  defineRobot(meta, robotEdglyDeliverInstructionsSchema)

export const {
  withHiddenFields: robotEdglyDeliverInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotEdglyDeliverInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotEdglyDeliverInstructions = Instructions['output']
export type RobotEdglyDeliverInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotEdglyDeliverInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotEdglyDeliverInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotEdglyDeliverInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
