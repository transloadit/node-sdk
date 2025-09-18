import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  files_per_page,
  interpolateRobot,
  page_number,
  path,
  recursive,
  return_file_stubs,
  robotBase,
  robotImport,
  s3Base,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/s3/import',
        credentials: 'YOUR_AWS_CREDENTIALS',
        path: 'path/to/files/',
        recursive: true,
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your S3 bucket',
  purpose_verb: 'import',
  purpose_word: 'Amazon S3',
  purpose_words: 'Import files from Amazon S3',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 10,
  title: 'Import files from Amazon S3',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'S3ImportRobot',
  priceFactor: 10,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotS3ImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(s3Base)
  .extend({
    robot: z.literal('/s3/import').describe(`
If you are new to Amazon S3, see our tutorial on [using your own S3 bucket](/docs/faq/how-to-set-up-an-amazon-s3-bucket/).

The URL to the result file in your S3 bucket will be returned in the <dfn>Assembly Status JSON</dfn>.

> [!Warning]
> **Use DNS-compliant bucket names**. Your bucket name [must be DNS-compliant](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html) and must not contain uppercase letters. Any non-alphanumeric characters in the file names will be replaced with an underscore, and spaces will be replaced with dashes. If your existing S3 bucket contains uppercase letters or is otherwise not DNS-compliant, rewrite the result URLs using the <dfn>Robot</dfn>’s \`url_prefix\` parameter.

<span id="minimum-s3-iam-permissions" aria-hidden="true"></span>

## Limit access

You will also need to add permissions to your bucket so that Transloadit can access it properly. Here is an example IAM policy that you can use. Following the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege), it contains the **minimum required permissions** to export a file to your S3 bucket using Transloadit. You may require more permissions (especially viewing permissions) depending on your application.

Please change \`{BUCKET_NAME}\` in the values for \`Sid\` and \`Resource\` accordingly. Also, this policy will grant the minimum required permissions to all your users. We advise you to create a separate Amazon IAM user, and use its User ARN (can be found in the "Summary" tab of a user [here](https://console.aws.amazon.com/iam/home#users)) for the \`Principal\` value. More information about this can be found [here](https://docs.aws.amazon.com/AmazonS3/latest/dev/AccessPolicyLanguage_UseCases_s3_a.html).

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowTransloaditToImportFilesIn{BUCKET_NAME}Bucket",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::{BUCKET_NAME}", "arn:aws:s3:::{BUCKET_NAME}/*"]
    }
  ]
}
\`\`\`

The \`Sid\` value is just an identifier for you to recognize the rule later. You can name it anything you like.

The policy needs to be separated into two parts, because the \`ListBucket\` action requires permissions on the bucket while the other actions require permissions on the objects in the bucket. When targeting the objects there's a trailing slash and an asterisk in the \`Resource\` parameter, whereas when the policy targets the bucket, the slash and the asterisk are omitted.

In order to build proper result URLs we need to know the region in which your S3 bucket resides. For this we require the \`GetBucketLocation\` permission. Figuring out your bucket's region this way will also slow down your Assemblies. To make this much faster and to also not require the \`GetBucketLocation\` permission, we have added the \`bucket_region\` parameter to the /s3/store and /s3/import Robots. We recommend using them at all times.

Please keep in mind that if you use bucket encryption you may also need to add \`"sts:*"\` and \`"kms:*"\` to the bucket policy. Please read [here](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html) and [here](https://aws.amazon.com/blogs/security/how-to-restrict-amazon-s3-bucket-access-to-a-specific-iam-role/) in case you run into trouble with our example bucket policy.
`),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants to this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive an error: \`A client error (NoSuchKey) occurred when calling the GetObject operation: The specified key does not exist.\`

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\` wisely here.
`),
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

export const robotS3ImportInstructionsWithHiddenFieldsSchema =
  robotS3ImportInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotS3ImportInstructionsSchema.shape.result]).optional(),
  })

export type RobotS3ImportInstructions = z.infer<typeof robotS3ImportInstructionsSchema>
export type RobotS3ImportInstructionsWithHiddenFields = z.infer<
  typeof robotS3ImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotS3ImportInstructionsSchema = interpolateRobot(
  robotS3ImportInstructionsSchema,
)
export type InterpolatableRobotS3ImportInstructions = InterpolatableRobotS3ImportInstructionsInput

export type InterpolatableRobotS3ImportInstructionsInput = z.input<
  typeof interpolatableRobotS3ImportInstructionsSchema
>

export const interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotS3ImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotS3ImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotS3ImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema
>
