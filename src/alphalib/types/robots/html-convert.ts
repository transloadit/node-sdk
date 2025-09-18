import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      captured: {
        robot: '/html/convert',
        url: 'https://transloadit.com',
      },
    },
  },
  example_code_description: 'Take a full screenshot of the Transloadit homepage:',
  extended_description: `
> [!Warning]
> A validation error will occur if neither an HTML file is uploaded nor a URL parameter is given.

> [!Note]
> Any files imported within the HTML page will be included in the cost.
`,
  minimum_charge: 1048576,
  output_factor: 0.5,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'takes screenshots of web pages or uploaded HTML pages',
  purpose_verb: 'take',
  purpose_word: 'take screenshots of a webpage',
  purpose_words: 'Take screenshots of webpages or HTML files',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Take screenshots of webpages or uploaded HTML files',
  typical_file_size_mb: 0.6,
  typical_file_type: 'webpage',
  name: 'HtmlConvertRobot',
  priceFactor: 1,
  queueSlotCount: 30,
  minimumCharge: 1048576,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotHtmlConvertInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/html/convert').describe(`
A URL can be provided instead of an input HTML file, to capture a screenshot from the website referenced by the URL.

Use [🤖/image/resize](/docs/robots/image-resize/) to resize or crop the screenshot as needed.
`),
    url: z
      .string()
      .nullable()
      .default(null)
      .describe(`
The URL of the web page to be converted. Optional, as you can also upload/import HTML files and pass it to this <dfn>Robot</dfn>.
`),
    format: z
      .enum(['jpeg', 'jpg', 'pdf', 'png'])
      .default('png')
      .describe(`
The format of the resulting image.
`),
    fullpage: z
      .boolean()
      .default(true)
      .describe(`
Determines if a screenshot of the full page should be taken or not.

If set to \`true\`, the \`height\` parameter will not have any effect, as heights of websites vary. You can control the size of the resulting image somewhat, though, by setting the \`width\` parameter.

If set to \`false\`, an image will be cropped from the top of the webpage according to your \`width\` and \`height\` parameters.
`),
    omit_background: z
      .boolean()
      .default(false)
      .describe(`
Determines whether to preserve a transparent background in HTML pages. Useful if you're generating artwork in HTML that you want to overlay on e.g. a video.

The default of \`false\` fills transparent areas with a white background, for easier reading/printing.

This parameter is only used when \`format\` is not \`pdf\`.
`),
    width: z
      .number()
      .int()
      .min(1)
      .default(1024)
      .describe(`
The screen width that will be used, in pixels. Change this to change the  dimensions of the resulting image.
`),
    height: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(`
The screen height that will be used, in pixels. By default this equals the length of the web page in pixels if \`fullpage\` is set to \`true\`. If \`fullpage\` is set to \`false\`, the height parameter takes effect and defaults to the value \`768\`.
`),
    delay: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(`
The delay (in milliseconds) applied to allow the page and all of its JavaScript to render before taking the screenshot.
`),
    headers: z
      .record(z.string())
      .optional()
      .describe(`
An object containing optional headers that will be passed along with the original request to the website. For example, this parameter can be used to pass along an authorization token along with the request.
`),
    wait_until: z
      .enum(['domcontentloaded', 'load', 'networkidle', 'commit'])
      .default('networkidle')
      .describe(`
The event to wait for before taking the screenshot. Used for loading Javascript, and images.

See [Playwright's documentation](https://playwright.dev/docs/api/class-page#page-wait-for-load-state) for more information.
`),
  })
  .strict()

export const robotHtmlConvertInstructionsWithHiddenFieldsSchema =
  robotHtmlConvertInstructionsSchema.extend({
    debuginfo: z.boolean().optional(),
    timeouts: z.record(z.unknown()).optional(),
    actions: z.array(z.record(z.unknown())).optional(),
    result: z
      .union([z.literal('debug'), robotHtmlConvertInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotHtmlConvertInstructions = z.infer<typeof robotHtmlConvertInstructionsSchema>
export type RobotHtmlConvertInstructionsWithHiddenFields = z.infer<
  typeof robotHtmlConvertInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotHtmlConvertInstructionsSchema = interpolateRobot(
  robotHtmlConvertInstructionsSchema,
)
export type InterpolatableRobotHtmlConvertInstructions =
  InterpolatableRobotHtmlConvertInstructionsInput

export type InterpolatableRobotHtmlConvertInstructionsInput = z.input<
  typeof interpolatableRobotHtmlConvertInstructionsSchema
>

export const interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotHtmlConvertInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotHtmlConvertInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotHtmlConvertInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema
>
