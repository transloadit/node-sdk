import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  files_per_page,
  page_number,
  path,
  recursiveImport,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
  s3Base,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/s3/import', 'YOUR_AWS_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your S3 bucket',
  purpose_word: 'Amazon S3',
  purpose_words: 'Import files from Amazon S3',
  requires_credentials: true,
  title: 'Import files from Amazon S3',
  name: 'S3ImportRobot',
  priceFactor: 10,
  queueSlotCount: 10,
}

export const robotS3ImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(s3Base)
  .extend({
    robot: z.literal('/s3/import').describe(`
If you are new to Amazon S3, see our tutorial on [using your own S3 bucket](/docs/faq/how-to-set-up-an-amazon-s3-bucket/).

<span id="minimum-s3-iam-permissions" aria-hidden="true"></span>

## Limit access

Use dedicated AWS credentials in your <dfn>Template Credentials</dfn> and grant that IAM identity access only to the bucket and objects it needs. The following example is an **identity-based IAM policy** for reading current objects from one general purpose S3 bucket. Attach it to the IAM user or role whose credentials you supply to Transloadit, not to the bucket. An identity-based policy has no \`Principal\` element: it applies to the identity it is attached to.

Replace \`{BUCKET_NAME}\` in both \`Resource\` values with your bucket name. The bucket-level statement permits listing objects and discovering the bucket's region; the object-level statement permits downloading them. See [AWS's S3 operation permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html) and [identity-based versus resource-based policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html).

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadBucketMetadata",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": "arn:aws:s3:::{BUCKET_NAME}"
    },
    {
      "Sid": "ReadBucketObjects",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::{BUCKET_NAME}/*"
    }
  ]
}
\`\`\`

The \`Sid\` values are labels for recognizing statements. Supplying the correct \`bucket_region\` avoids automatic region discovery and its \`s3:GetBucketLocation\` permission. The example still grants bucket-wide listing and reads: narrow its object resources and listing conditions when your workflow needs only a specific prefix.

This example is not a guarantee of access. Explicit denies, organization policies, permission boundaries, cross-account bucket policies, and object ownership can affect the result. For cross-account access, review [AWS's policy evaluation guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html).

For SSE-KMS-encrypted objects, also configure the IAM identity and KMS key policy with the key permissions required by [AWS's GetObject documentation](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html), scoped to the intended key. KMS actions belong in IAM identity policies and KMS key policies, **not S3 bucket policies**. Do not grant broad \`sts:*\` or \`kms:*\` permissions as a workaround.
`),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants to this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

Use \`/\` to import files from the bucket root. Object keys do not need a leading slash. Enable \`recursive\` to include files under nested prefixes.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursiveImport,
    page_number: page_number.optional().describe(`
The pagination page number. For now, in order to not break backwards compatibility in non-recursive imports, this only works when recursive is set to \`true\`.

When doing big imports, make sure no files are added or removed from other scripts within your path, otherwise you might get weird results with the pagination.
`),
    files_per_page: files_per_page.optional().describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
    return_file_stubs,
    range: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(`
Allows you to specify one or more byte ranges to import from the file. S3 must support range requests for this to work.

**Single range**: Use a string like \`"0-99"\` to import bytes 0-99 (the first 100 bytes).

**Multiple ranges**: Use an array like \`["0-99", "200-299"]\` to import multiple separate ranges. The resulting file will contain all requested ranges concatenated together, with zero bytes (\\0) filling any gaps between non-contiguous ranges.

**Range formats**:
- \`"0-99"\`: Bytes 0 through 99 (inclusive)
- \`"100-199"\`: Bytes 100 through 199 (inclusive)
- \`"-100"\`: The last 100 bytes of the file

**Important notes**:
- S3 supports range requests by default
- Overlapping ranges are allowed and will be included as requested
- The resulting file size will be the highest byte position requested, with gaps filled with zero bytes
- Each range is fetched in a separate request to ensure compatibility with S3
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotS3ImportInstructionsSchema.shape> =
  defineRobot(meta, robotS3ImportInstructionsSchema)

export const {
  withHiddenFields: robotS3ImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotS3ImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotS3ImportInstructions = Instructions['output']
export type RobotS3ImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotS3ImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotS3ImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotS3ImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotS3ImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
