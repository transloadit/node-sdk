import { z } from 'zod'

import { interpolateRobot, type RobotMetaInput, robotBase } from './_instructions-primitives.ts'

// @ts-expect-error - AssemblySavejsonRobot is not ready yet @TODO please supply missing keys
export const meta: RobotMetaInput = {
  name: 'AssemblySavejsonRobot',
  priceFactor: 0,
  queueSlotCount: 5,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: true,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAssemblySavejsonInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/assembly/savejson').describe(`
TODO: Add robot description here
`),
  })
  .strict()

export type RobotAssemblySavejsonInstructions = z.infer<
  typeof robotAssemblySavejsonInstructionsSchema
>

export const interpolatableRobotAssemblySavejsonInstructionsSchema = interpolateRobot(
  robotAssemblySavejsonInstructionsSchema,
)
export type InterpolatableRobotAssemblySavejsonInstructions =
  InterpolatableRobotAssemblySavejsonInstructionsInput

export type InterpolatableRobotAssemblySavejsonInstructionsInput = z.input<
  typeof interpolatableRobotAssemblySavejsonInstructionsSchema
>
