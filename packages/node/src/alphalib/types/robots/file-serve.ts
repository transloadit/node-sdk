import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      resized: {
        robot: '/image/resize',
        use: ':original',
        width: 800,
        height: 450,
        resize_strategy: 'fit',
      },
      served: {
        robot: '/file/serve',
        use: 'resized',
        cache_duration: 86400,
      },
    },
  },
  example_code_description: 'Serve transformed files with explicit browser and CDN cache duration:',
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
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileServeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/serve').describe(`
When you want Transloadit to tranform files on the fly, you can use this <dfn>Robot</dfn> to determine which <dfn>Step</dfn> of a <dfn>Template</dfn> should be served to the end-user (via a CDN), as well as set extra information on the served files, such as headers. This way you can for instance suggest the CDN for how long to keep cached copies of the result around. By default, we instruct browsers to cache the result for 72h (\`259200\` seconds) and CDNs to cache the content for 24h (\`86400\` seconds). Use the \`cache_duration\` parameter to customize both values at once.

🤖/file/serve merely acts as the glue layer between our <dfn>Assembly</dfn> engine and serving files over HTTP. It let's you pick the proper result of a series of <dfn>Steps</dfn> via the \`use\` parameter and configure headers on the original content. That is where its responsibilies end, and 🤖/tlcdn/deliver, then takes over to globally distribute this original content across the globe, and make sure that is cached close to your end-users, when they make requests such as <https://my-app.tlcdn.com/resize-img/canoe.jpg?w=500>, another. 🤖/tlcdn/deliver is not a part of your <dfn>Assembly Instructions</dfn>, but it may appear on your invoices as bandwidth charges incur when distributing the cached copies. 🤖/file/serve only charges when the CDN does not have a cached copy and requests to regenerate the original content, which depending on your caching settings could be just once a month, or year, per file/transformation.

While theoretically possible, you could use [🤖/file/serve](/docs/robots/file-serve/) directly in HTML files, but we strongly recommend against this, because if your site gets popular and the media URL that /file/serve is handling gets hit one million times, that is one million new image resizes. Wrapping it with a CDN (and thanks to the caching that comes with it) makes sure encoding charges stay low, as well as latencies.

Also consider configuring caching headers and cache-control directives to control how content is cached and invalidated on the CDN edge servers, balancing between freshness and efficiency.

## Smart CDN security with signed URLs

You can leverage [signed Smart CDN URLs](/docs/api/authentication/#smart-cdn) to avoid abuse of our encoding platform. Below is a quick Node.js example using our Node SDK, but there are [examples for other languages and SDKs](/docs/api/authentication/#example-code) as well.

\`\`\`javascript
// yarn add transloadit
// or
// npm install --save transloadit

import { Transloadit } from 'transloadit'

const transloadit = new Transloadit({
  authKey: 'YOUR_TRANSLOADIT_KEY',
  authSecret: 'YOUR_TRANSLOADIT_SECRET',
})

const url = transloadit.getSignedSmartCDNUrl({
  workspace: 'YOUR_WORKSPACE',
  template: 'YOUR_TEMPLATE',
  input: 'image.png',
  urlParams: { height: 100, width: 100 },
})

console.log(url)
\`\`\`

This will generate a signed Smart CDN URL that includes authentication parameters, preventing unauthorized access to your transformation endpoints.

For new integrations, use the modern \`sig\` + \`exp\` format. Legacy \`s\` signatures are deprecated. Also note that the expiration window is the practical cache window for signed results: shorter expirations tighten access control, while longer expirations improve cache reuse and lower encoding volume.

## More information

- [Content Delivery](/services/content-delivery/)
- [🤖/file/serve](/docs/robots/file-serve/) pricing
- [🤖/tlcdn/deliver](/docs/robots/tlcdn-deliver/) pricing
- [File Preview Feature](/blog/2024/06/file-preview-with-smart-cdn/) blog post
`),
    cache_duration: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
An optional duration in seconds that the served file should be cached. When set, this value is used for both the \`max-age\` (browser cache) and \`s-maxage\` (shared/CDN cache) directives in the \`Cache-Control\` header, overriding the defaults. For example, setting \`cache_duration\` to \`43200\` would cache the file for 12 hours.

This is useful for controlling data retention in CDNs. For instance, if your temporary files are deleted after 24 hours, you can set \`cache_duration\` to \`86400\` to ensure cached copies also expire within that window.
`),
    headers: z
      .record(z.string())
      .default({
        'Access-Control-Allow-Headers':
          'X-Requested-With, Content-Type, Cache-Control, Accept, Content-Length, Transloadit-Client, Authorization, Range, If-Range',
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers':
          'Transloadit-Assembly-URL, Content-Range, Content-Length, Accept-Ranges',
        'Cache-Control': 'public, max-age=259200, s-maxage=86400',
        'Content-Type': '${file.mime}; charset=utf-8',
        'Transloadit-Assembly': '…',
        'Transloadit-RequestID': '…',
        'Accept-Ranges': 'bytes',
      })
      .describe(`
An object containing a list of headers to be set for a file as we serve it to a CDN/web browser, such as \`{ FileURL: "\${file.url_name}" }\` which will be merged over the defaults, and can include any available [Assembly Variable](/docs/topics/assembly-instructions/#assembly-variables).

The \`Accept-Ranges: bytes\` header advertises that HTTP range requests are supported for seekable media playback. This relies on Transloadit's storage backends (S3, GCS, etc.) all honoring Range request headers. The CORS headers include \`Range\` and \`If-Range\` in \`Access-Control-Allow-Headers\` to permit cross-origin range requests, and expose \`Content-Range\`, \`Content-Length\`, and \`Accept-Ranges\` via \`Access-Control-Expose-Headers\` so browser JavaScript can read these values.
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
