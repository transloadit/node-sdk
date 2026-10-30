import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobot,
  robotBase,
  robotStoreMeta,
  robotUse,
  storeFilePath,
  supabaseBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/supabase/store', 'YOUR_SUPABASE_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in a Supabase Storage bucket:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Supabase Storage buckets',
  purpose_word: 'Supabase Storage',
  purpose_words: 'Export files to Supabase Storage',
  title: 'Export files to Supabase Storage',
  name: 'SupabaseStoreRobot',
}

export const robotSupabaseStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(supabaseBase)
  .extend({
    robot: z.literal('/supabase/store').describe(`
## Upload as a Supabase user

For [Supabase session-token authentication](https://supabase.com/docs/guides/storage/s3/authentication#session-token), supply your project ref as \`key\`, your project’s anon key as \`secret\`, and the user’s access-token JWT as \`session_token\`. Supabase applies the authenticated user’s Row Level Security (RLS) policies to these uploads. Choose a \`path\` those policies permit, and use the endpoint and region from your project’s S3 connection settings.

Send the user’s JWT with each Assembly from your trusted backend. It must remain valid through queuing, processing, and upload retries; the Robot does not refresh it. Without \`session_token\`, continue using your generated Supabase S3 access key and secret. Those generated S3 access keys bypass RLS.

Supply \`session_token\` inline in the Step. Assembly Status returns \`fields\` unchanged, so passing the JWT through Assembly \`fields\` exposes it in the status response.

The result URL uses Supabase’s public-object URL format. It does not grant read access to a private bucket; use Supabase’s download authorization for private objects.
`),
    credentials: supabaseBase.shape.credentials.describe(`
The name of your Supabase <dfn>Template Credentials</dfn>, containing the bucket, host, key, secret, and bucket region. You can instead supply those parameters directly in the Step.

For generated S3 access-key authentication, use the endpoint and S3 access keys from your Supabase project’s S3 connection settings. For user-scoped session-token authentication, use the project ref as \`key\` and the project’s anon key as \`secret\`, then supply the user’s access-token JWT as \`session_token\` with each Assembly.
`),
    path: storeFilePath,
    session_token: z
      .string()
      .min(1)
      .optional()
      .describe(`
The user’s Supabase access-token JWT for [session-token authentication](https://supabase.com/docs/guides/storage/s3/authentication#session-token). Use the Supabase project ref as \`key\` and the project’s anon key as \`secret\` so Supabase applies that user’s RLS policies. The JWT must remain valid through queuing, processing, and upload retries; the Robot does not refresh it. Supply this value directly in the Step; Assembly Status exposes values in \`fields\`.
`),
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your Supabase Storage bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotSupabaseStoreInstructionsSchema.shape> =
  defineRobot(meta, robotSupabaseStoreInstructionsSchema)

export const {
  withHiddenFields: robotSupabaseStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSupabaseStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSupabaseStoreInstructions = Instructions['output']
export type RobotSupabaseStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSupabaseStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
