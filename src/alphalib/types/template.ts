import { z } from 'zod'

import { robotStepsInstructionsSchema } from './robots/_index.ts'

export const stepSchema = z
  .object({
    // This is a hack to get nicer robot hover messages in editors.
    robot: z.string().describe('The [robot](https://transloadit.com/docs/transcoding/) to use'),
  })
  .and(robotStepsInstructionsSchema)
export type Step = z.infer<typeof stepSchema>

export const stepsSchema = z.record(stepSchema).describe('Contains Assembly Instructions.')

export type Steps = z.infer<typeof stepsSchema>
export const templateSchema = z
  .object({
    allow_steps_override: z
      .boolean()
      .optional()
      .describe(
        'Set this to false to disallow Overruling Templates at Runtime. If you set this to false then template_id and steps will be mutually exclusive and you may only supply one of those parameters. Recommended when deploying Transloadit in untrusted environments. This makes sense to set as part of a Template, rather than on the Assembly itself when creating it.'
      ),
    notify_url: z
      .string()
      .optional()
      .describe(
        'Transloadit can send a Pingback to your server when the Assembly is completed. We’ll send the Assembly status in a form url-encoded JSON string inside of a transloadit field in a multipart POST request to the URL supplied here.'
      ),
    fields: z
      .record(z.union([z.number(), z.string()]))
      .optional()
      .describe(
        'An object of string to string pairs (name -> value) that can be used as Assembly Variables, just like additional form fields can.'
      ),
    quite: z
      .boolean()
      .optional()
      .describe(
        'Set this to true to reduce the response from an Assembly POST request to only the necessary fields. This prevents any potentially confidential information being leaked to the end user who is making the Assembly request. A successful Assembly will only include the ok and assembly_id fields. An erroneous Assembly will only include the error, http_code, message and assembly_id fields. The full Assembly Status will then still be sent to the notify_url if one was specified.'
      ),
    steps: stepsSchema,
  })
  .required({ steps: true })

export type Template = z.infer<typeof templateSchema>
