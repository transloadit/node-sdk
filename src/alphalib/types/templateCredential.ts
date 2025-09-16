import { z } from 'zod'

import { assemblyAuthInstructionsSchema } from './template.ts'

export const retrieveTemplateCredentialsParamsSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
  })
  .strict()

export const templateCredentialsSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    name: z
      .string()
      .min(4)
      .regex(/^[a-zA-Z-]+$/)
      .describe(
        'Name of the Template Credentials. Must be longer than 3 characters, can only contain dashes and latin letters.',
      ),
    type: z
      .enum([
        'azure',
        'backblaze',
        'cloudflare',
        'companion',
        'digitalocean',
        'dropbox',
        'ftp',
        'google',
        'http',
        'minio',
        'rackspace',
        's3',
        'sftp',
        'supabase',
        'swift',
        'tigris',
        'vimeo',
        'wasabi',
        'youtube',
      ])
      .describe('The service to create credentials for.'),
    content: z
      .object({})
      .describe(`Key and value pairs which fill in the details of the Template Credentials. For example, for an S3 bucket, this would be a valid content object to send:

\`\`\`jsonc
{
  "content": {
    "key": "xyxy",
    "secret": "xyxyxyxy",
    "bucket" : "mybucket.example.com",
    "bucket_region": "us-east-1"
  }
}
\`\`\`
`),
  })
  .strict()
