import { z } from 'zod'

import { robotsSchema, robotsWithHiddenBotsAndFieldsSchema } from './robots/_index.ts'
import type { RobotUse } from './robots/_instructions-primitives.ts'

export const stepSchema = z
  .object({
    // This is a hack to get nicer robot hover messages in editors.
    robot: z
      .string()
      .describe('Identifier of the [robot](https://transloadit.com/docs/robots/) to execute'),
  })
  .and(robotsSchema)
export const stepsSchema = z.record(stepSchema).describe('Contains Assembly Instructions.')
export type Step = z.infer<typeof stepSchema>
export type StepInput = z.input<typeof stepSchema>
export type StepInputWithUse = StepInput & RobotUse
export type Steps = z.infer<typeof stepsSchema>
export type StepsInput = z.input<typeof stepsSchema>
export const optionalStepsSchema = stepsSchema.optional()

export const stepSchemaWithHiddenFields = z
  .object({
    // This is a hack to get nicer robot hover messages in editors.
    robot: z
      .string()
      .describe('Identifier of the [robot](https://transloadit.com/docs/robots/) to execute'),
  })
  .and(robotsWithHiddenBotsAndFieldsSchema)
export const stepsSchemaWithHiddenFields = z
  .record(stepSchemaWithHiddenFields)
  .describe('Contains Assembly Instructions.')
export type StepWithHiddenFields = z.infer<typeof stepSchemaWithHiddenFields>
export type StepWithHiddenFieldsInput = z.input<typeof stepSchemaWithHiddenFields>
export type StepsWithHiddenFields = z.infer<typeof stepsSchemaWithHiddenFields>
export type StepsWithHiddenFieldsInput = z.input<typeof stepsSchemaWithHiddenFields>
const optionalStepsWithHiddenFieldsSchema = stepsSchemaWithHiddenFields.optional()

export const fieldsSchema = z
  .record(z.any())
  .optional()
  .describe(
    'An object of string keyed values (name -> value) that can be used as Assembly Variables, just like additional form fields can. You can use anything that is JSON stringifyable as a value',
  )

export const notifyUrlSchema = z
  .string()
  .optional()
  .nullable()
  .describe(
    'Transloadit can send a Pingback to your server when the Assembly is completed. We’ll send the Assembly status in a form url-encoded JSON string inside of a transloadit field in a multipart POST request to the URL supplied here.',
  )

export const templateIdSchema = z
  .string()
  .optional()
  .describe(
    'The ID of the Template that contains your Assembly Instructions. If you set `allow_steps_override` to `false` in your Template, then `steps` and `template_id` will be mutually exclusive — you may supply only one of these parameters.',
  )

export const assemblyAuthInstructionsSchema = z
  .object({
    key: z.string().describe('Transloadit API key used to authenticate requests'),
    secret: z.string().optional().describe('Transloadit API secret used to sign requests'),
    expires: z
      .string()
      .optional()
      .describe('ISO 8601 expiration timestamp for signature authentication'),
    max_size: z.number().optional().describe('Maximum allowed upload size in bytes'),
    nonce: z.string().optional().describe('Unique, random nonce for this request'),
    referer: z
      .string()
      .optional()
      .describe('Regular expression matched against the HTTP Referer to restrict upload origin'),
  })
  .describe(`Contains at least your Transloadit Auth Key in the \`key\` property.

If you enable Signature Authentication, you must also set an expiry date for the request in the expires property:

\`\`\`jsonc
{
  "key": "23c96d084c744219a2ce156772ec3211",
  "expires": "2009-08-28T01:02:03.000Z"
}
\`\`\`

We strongly recommend including the \`nonce\` property — a randomly generated, unique value per request that prevents duplicate processing upon retries, can aid in debugging, and avoids attack vectors such as signature key reuse:

\`\`\`jsonc
{
  // …
  "nonce": "04ac6cb6-df43-41fb-a7fd-e5dd711a64e1"
}
\`\`\`

The \`referer\` property is a regular expression to match against the HTTP referer of this upload, such as \`"example\\.org"\`. Specify this key to make sure that uploads only come from your domain.

Uploads without a referer will always pass (as they are turned off for some browsers) making this useful in just a handful of use cases. For details about regular expressions, see [Mozilla's RegExp documentation](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

The \`max_size\` property can be used to set a maximum size that an upload can have in bytes, such as \`1048576\` (1 MB). Specify this to prevent users from uploading excessively large files.

This can be set as part of the Assembly request or as part of the Template.

The file size is checked as soon as the upload is started and if it exceeds the maximum size, the entire upload process is canceled and the Assembly will error out, even if it contains files that do not exceed the \`max_size\` limitation.

If you want to just ignore the files that exceed a certain size, but process all others, then please use [🤖/file/filter](https://transloadit.com/docs/robots/file-filter/).
`)

const assemblyInstructionsSharedShape = {
  allow_steps_override: z
    .boolean()
    .optional()
    .describe(
      'Set this to false to disallow Overruling Templates at Runtime. If you set this to false then template_id and steps will be mutually exclusive and you may only supply one of those parameters. Recommended when deploying Transloadit in untrusted environments. This makes sense to set as part of a Template, rather than on the Assembly itself when creating it.',
    ),
  notify_url: notifyUrlSchema,
  fields: fieldsSchema,
  quiet: z
    .boolean()
    .optional()
    .describe(
      'Set this to true to reduce the response from an Assembly POST request to only the necessary fields. This prevents any potentially confidential information being leaked to the end user who is making the Assembly request. A successful Assembly will only include the ok and assembly_id fields. An erroneous Assembly will only include the error, http_code, message and assembly_id fields. The full Assembly Status will then still be sent to the notify_url if one was specified.',
    ),
  // This is done to avoid heavy inference cost
  steps: optionalStepsSchema as typeof optionalStepsSchema,
  template_id: templateIdSchema,
} as const

export const assemblyInstructionsSchema = z.object({
  auth: assemblyAuthInstructionsSchema.optional(),
  ...assemblyInstructionsSharedShape,
})

export const assemblyInstructionsSchemaWithRequiredAuth = z.object({
  auth: assemblyAuthInstructionsSchema,
  ...assemblyInstructionsSharedShape,
})

export type AssemblyInstructions = z.infer<typeof assemblyInstructionsSchema>
export type AssemblyInstructionsInput = z.input<typeof assemblyInstructionsSchema>
export type AssemblyAuthInstructionsInput = z.input<typeof assemblyAuthInstructionsSchema>
export type AssemblyAuthInstructionsPartialInput = Partial<
  z.input<typeof assemblyAuthInstructionsSchema>
>

export const templateParamsSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    name: z
      .string()
      .min(5)
      .max(40)
      .regex(/^[a-z-]+$/)
      .describe(
        'Name of this Template. Must be between 5-40 symbols (inclusive), lowercase, can only contain dashes and latin letters.',
      ),
    template: z
      .string()
      .describe(`All the [Assembly Instructions](/docs/topics/assembly-instructions/) and [Template options](/docs/topics/templates/#template-options) as a JSON encoded string.

Example value:

\`\`\`json
"{\\"allow_steps_override\\": false, \\"steps\\": { ... }}"
\`\`\`
`),
    require_signature_auth: z
      .union([z.literal(0), z.literal(1)])
      .default(0)
      .describe(
        'Use `1` to deny requests that do not include a signature. With [Signature Authentication](/docs/api/authentication/) you can ensure no one else is sending requests on your behalf.',
      ),
  })
  .strict()

export const templateGetParamsSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
  })
  .strict()

export const templateListParamsSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    page: z
      .number()
      .int()
      .default(1)
      .describe('Specifies the current page, within the current pagination'),
    pagesize: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .default(50)
      .describe(
        'Specifies how many Templates to be received per API request, which is useful for pagination.',
      ),
    sort: z
      .enum(['id', 'name', 'created', 'modified'])
      .default('created')
      .describe('The field to sort by.'),
    order: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe(
        'The sort direction. Can be `"desc"` for descending (default) or `"asc"` for ascending.',
      ),
    fromdate: z
      .string()
      .describe(
        'Specifies the minimum Assembly UTC creation date/time. Only Templates after this time will be retrieved. Use the format `Y-m-d H:i:s`.',
      ),
    todate: z
      .string()
      .default('NOW()')
      .describe(
        'Specifies the maximum Assembly UTC creation date/time. Only Templates before this time will be retrieved. Use the format `Y-m-d H:i:s`.',
      ),
    keywords: z
      .array(z.string())
      .default([])
      .describe(
        'Specifies keywords to be matched in the Assembly Status. The Assembly fields checked include the `id`, `redirect_url`, `fields`, and `notify_url`, as well as error messages and files used.',
      ),
  })
  .strict()

// These are used in system tests, but not exposed to the public right now
// Meaning we do not want to document them, do not want to offer auto complete on them
// if customers use them, they will have to surpress a typescript error
// however when they do, our runtime schema validation will not blow up on it
// because we are using this version of the schema in our actual API
// so that tests can also use them:
export const assemblyInstructionsWithHiddenSchema = assemblyInstructionsSchema.extend({
  steps: optionalStepsWithHiddenFieldsSchema as typeof optionalStepsWithHiddenFieldsSchema,
  imagemagick_stack: z.string().optional(),
  exiftool_stack: z.string().optional(),
  mplayer_stack: z.string().optional(),
  mediainfo_stack: z.string().optional(),
  ffmpeg_stack: z.string().optional(),
  usage_tags: z.string().optional(),
  randomize_watermarks: z.boolean().optional(),
  await: z
    .union([
      z.boolean(),
      z.literal('notification'),
      z.literal('persisting'),
      z.literal('transcoding'),
    ])
    .optional(),
  blocking: z.boolean().optional(),
  reparse_template: z.union([z.literal(1), z.boolean()]).optional(),
  ignore_upload_meta_data_errors: z.boolean().optional(),
  emit_execution_progress: z.boolean().optional(),
})

export type AssemblyInstructionsWithHidden = z.infer<typeof assemblyInstructionsWithHiddenSchema>
export type AssemblyInstructionsWithHiddenInput = z.input<
  typeof assemblyInstructionsWithHiddenSchema
>
