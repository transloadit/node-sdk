import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  minimum_charge: 0,
  output_factor: 1,
  purpose_sentence: 'serves files to web browsers',
  purpose_verb: 'serve',
  purpose_word: 'Serve files',
  purpose_words: 'Serve files to web browsers',
  service_slug: 'content-delivery',
  slot_count: 0,
  title: 'Serve files to web browsers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileServeRobot',
  priceFactor: 4,
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileServeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/serve').describe(`
When you want Transloadit to tranform files on the fly, you can use this <dfn>Robot</dfn> to determine which <dfn>Step</dfn> of a <dfn>Template</dfn> should be served to the end-user (via a CDN), as well as set extra information on the served files, such as headers. This way you can for instance suggest the CDN for how long to keep cached copies of the result around. By default, as you can see in the \`headers\` parameter, we instruct browsers to cache the result for 72h (\`259200\` seconds) and CDNs to cache the content for 24h (\`86400\` seconds). These values should be adjusted to suit your use case.

🤖/file/serve merely acts as the glue layer between our <dfn>Assembly</dfn> engine and serving files over HTTP. It let's you pick the proper result of a series of <dfn>Steps</dfn> via the \`use\` parameter and configure headers on the original content. That is where its responsibilies end, and 🤖/tlcdn/deliver, then takes over to globally distribute this original content across the globe, and make sure that is cached close to your end-users, when they make requests such as <https://my-app.tlcdn.com/resize-img/canoe.jpg?w=500>, another. 🤖/tlcdn/deliver is not a part of your <dfn>Assembly Instructions</dfn>, but it may appear on your invoices as bandwidth charges incur when distributing the cached copies. 🤖/file/serve only charges when the CDN does not have a cached copy and requests to regenerate the original content, which depending on your caching settings could be just once a month, or year, per file/transformation.

While theoretically possible, you could use [🤖/file/serve](/docs/robots/file-serve/) directly in HTML files, but we strongly recommend against this, because if your site gets popular and the media URL that /file/serve is handling gets hit one million times, that is one million new image resizes. Wrapping it with a CDN (and thanks to the caching that comes with it) makes sure encoding charges stay low, as well as latencies.

Also consider configuring caching headers and cache-control directives to control how content is cached and invalidated on the CDN edge servers, balancing between freshness and efficiency.

More information on:

- [Content Delivery](/services/content-delivery/).
- [🤖/file/serve](/docs/robots/file-serve/) pricing.
- [🤖/tlcdn/deliver](/docs/robots/tlcdn-deliver/) pricing.
- [File Preview Feature](/blog/2024/06/file-preview-with-smart-cdn/) blog post.
`),
    headers: z
      .record(z.string())
      .default({
        'Access-Control-Allow-Headers':
          'X-Requested-With, Content-Type, Cache-Control, Accept, Content-Length, Transloadit-Client, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=259200, s-max-age=86400',
        'Content-Type': '${file.mime}; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Transloadit-Assembly': '…',
        'Transloadit-RequestID': '…',
      })
      .describe(`
An object containing a list of headers to be set for a file as we serve it to a CDN/web browser, such as \`{ FileURL: "\${file.url_name}" }\` which will be merged over the defaults, and can include any available [Assembly Variable](/docs/topics/assembly-instructions/#assembly-variables).
`),
  })
  .strict()

export const robotFileServeInstructionsWithHiddenFieldsSchema =
  robotFileServeInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotFileServeInstructionsSchema.shape.result]).optional(),
  })

export type RobotFileServeInstructions = z.infer<typeof robotFileServeInstructionsSchema>
export type RobotFileServeInstructionsInput = z.input<typeof robotFileServeInstructionsSchema>
export type RobotFileServeInstructionsWithHiddenFields = z.infer<
  typeof robotFileServeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileServeInstructionsSchema = interpolateRobot(
  robotFileServeInstructionsSchema,
)
export type InterpolatableRobotFileServeInstructions = InterpolatableRobotFileServeInstructionsInput

export type InterpolatableRobotFileServeInstructionsInput = z.input<
  typeof interpolatableRobotFileServeInstructionsSchema
>

export const interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileServeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileServeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileServeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema
>
