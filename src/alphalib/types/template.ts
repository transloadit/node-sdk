import { z } from 'zod'

import { robotsWithHiddenBotsAndFieldsSchema, robotsSchema } from './robots/_index.ts'
import type { RobotUse } from './robots/_instructions-primitives.ts'

export const stepSchema = z
  .object({
    // This is a hack to get nicer robot hover messages in editors.
    robot: z.string().describe('The [robot](https://transloadit.com/docs/transcoding/) to use'),
  })
  .and(robotsSchema)
export const stepsSchema = z.record(stepSchema).describe('Contains Assembly Instructions.')
export type Step = z.infer<typeof stepSchema>
export type StepInput = z.input<typeof stepSchema>
export type StepInputWithUse = StepInput & RobotUse
export type Steps = z.infer<typeof stepsSchema>
export type StepsInput = z.input<typeof stepsSchema>

export const stepSchemaWithHiddenFields = z
  .object({
    // This is a hack to get nicer robot hover messages in editors.
    robot: z.string().describe('The [robot](https://transloadit.com/docs/transcoding/) to use'),
  })
  .and(robotsWithHiddenBotsAndFieldsSchema)
export const stepsSchemaWithHiddenFields = z
  .record(stepSchemaWithHiddenFields)
  .describe('Contains Assembly Instructions.')
export type StepWithHiddenFields = z.infer<typeof stepSchemaWithHiddenFields>
export type StepWithHiddenFieldsInput = z.input<typeof stepSchemaWithHiddenFields>
export type StepsWithHiddenFields = z.infer<typeof stepsSchemaWithHiddenFields>
export type StepsWithHiddenFieldsInput = z.input<typeof stepsSchemaWithHiddenFields>

export const assemblyAuthInstructionsSchema = z.object({
  key: z.string().describe('The Transloadit API key to use'),
  secret: z.string().optional().describe('The Transloadit API secret to use'),
  expires: z.string().optional().describe('The Transloadit API expires to use'),
  max_size: z.number().optional().describe('The Transloadit API max_size to use'),
})

export const assemblyInstructionsSchema = z.object({
  auth: assemblyAuthInstructionsSchema.optional(),
  allow_steps_override: z
    .boolean()
    .optional()
    .describe(
      'Set this to false to disallow Overruling Templates at Runtime. If you set this to false then template_id and steps will be mutually exclusive and you may only supply one of those parameters. Recommended when deploying Transloadit in untrusted environments. This makes sense to set as part of a Template, rather than on the Assembly itself when creating it.',
    ),
  notify_url: z
    .string()
    .optional()
    .describe(
      'Transloadit can send a Pingback to your server when the Assembly is completed. We’ll send the Assembly status in a form url-encoded JSON string inside of a transloadit field in a multipart POST request to the URL supplied here.',
    ),
  fields: z
    .record(z.any())
    .optional()
    .describe(
      'An object of string keyed values (name -> value) that can be used as Assembly Variables, just like additional form fields can. You can use anything that is JSON stringifyable as a value',
    ),
  quiet: z
    .boolean()
    .optional()
    .describe(
      'Set this to true to reduce the response from an Assembly POST request to only the necessary fields. This prevents any potentially confidential information being leaked to the end user who is making the Assembly request. A successful Assembly will only include the ok and assembly_id fields. An erroneous Assembly will only include the error, http_code, message and assembly_id fields. The full Assembly Status will then still be sent to the notify_url if one was specified.',
    ),
  steps: stepsSchema.optional(),
  template_id: z.string().optional().describe('The Template ID to use'),
})

export type AssemblyInstructions = z.infer<typeof assemblyInstructionsSchema>
export type AssemblyInstructionsInput = z.input<typeof assemblyInstructionsSchema>
