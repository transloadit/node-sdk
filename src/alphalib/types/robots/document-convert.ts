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
      converted: {
        robot: '/document/convert',
        use: ':original',
        format: 'pdf',
      },
    },
  },
  example_code_description: 'Convert uploaded files to PDF documents:',
  extended_description: `
> [!Note]
> This <dfn>Robot</dfn> can convert files to PDF, but cannot convert PDFs to different formats. If you want to convert PDFs to say, JPEG or TIFF, use [🤖/image/resize](/docs/robots/image-resize/). If you want to turn them into text files or recognize (OCR) them to make them searchable, reach out, as we have a new <dfn>Robot</dfn> in the works for this.

Sometimes, a certain file type might not support what you are trying to accomplish. Perhaps your company is trying to automate document formatting, but it only works with docx, so all your docs need to be converted. Or maybe your stored jpg files are taking up too much space and you want a lighter format. Whatever the case, we have you covered.

Using this <dfn>Robot</dfn>, you can bypass the issues that certain file types may bring, by converting your file into the most suitable format. This also works in conjunction with our other <dfn>Robots</dfn>, allowing for even greater versatility when using our services.

> ![Warning]
> A general rule of this <dfn>Robot</dfn> is that converting files into an alien format category will result in an error. For example, SRT files can be converted into the VTT format, but not to an image.

The following file formats can be converted from:

- \`ai\`
- \`csv\`
- \`doc\`
- \`docx\`
- \`eps\`
- \`gif\`
- \`html\`
- \`jpg\`
- \`latex\`
- \`md\`
- \`oda\`
- \`odd\`
- \`odt\`
- \`ott\`
- \`png\`
- \`pot\`
- \`pps\`
- \`ppt\`
- \`pptx\`
- \`ppz\`
- \`ps\`
- \`rtf\`
- \`rtx\`
- \`svg\`
- \`text\`
- \`txt\`
- \`xhtml\`
- \`xla\`
- \`xls\`
- \`xlsx\`
- \`xml\`
`,
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'converts documents into different formats',
  purpose_verb: 'convert',
  purpose_word: 'convert',
  purpose_words: 'Convert documents into different formats',
  service_slug: 'document-processing',
  slot_count: 12,
  title: 'Convert documents into different formats',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentConvertRobot',
  priceFactor: 1,
  // This slot count needs to be unique, because unoconv can only process one document at a time,
  // and is also only included in WorkerSlotCalculator::slotsThatFit() when
  // we have enough idle unoconv daemons.
  // We do not want a queue of this Robot to block any other Robot's jobs.
  queueSlotCount: 32,
  minimumCharge: 1048576,
  lazyLoad: true,
  installVersionFile: process.env.API2_UNOCONV_INSTALL_VERSION_FILE || '',
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  // we cannot use coreConfig.numUnoconvDaemons, because it does not live in alphalib
  numDaemons: 8,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDocumentConvertInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/convert').describe(`
> [!Note]
> This Robot can convert files to PDF, but cannot convert PDFs to different formats. If you want to convert PDFs to say, JPEG or TIFF, use [🤖/image/resize](/docs/robots/image-resize/). If you want to turn them into text files or recognize (OCR) them to make them searchable, reach out, as we have a new Robot in the works for this.

Sometimes, a certain file type might not support what you are trying to accomplish. Perhaps your company is trying to automate document formatting, but it only works with docx, so all your docs need to be converted. Or maybe your stored jpg files are taking up too much space and you want a lighter format. Whatever the case, we have you covered.

Using this Robot, you can bypass the issues that certain file types may bring, by converting your file into the most suitable format. This also works in conjunction with our other Robots, allowing for even greater versatility when using our services.

> [!Warning]
> A general rule of this Robot is that converting files into an alien format category will result in an error. For example, SRT files can be converted into the VTT format, but not to an image.

The following file formats can be converted from:

- \`ai\`
- \`csv\`
- \`doc\`
- \`docx\`
- \`eps\`
- \`gif\`
- \`html\`
- \`jpg\`
- \`latex\`
- \`md\`
- \`oda\`
- \`odd\`
- \`odt\`
- \`ott\`
- \`png\`
- \`pot\`
- \`pps\`
- \`ppt\`
- \`pptx\`
- \`ppz\`
- \`ps\`
- \`rtf\`
- \`rtx\`
- \`svg\`
- \`text\`
- \`txt\`
- \`xhtml\`
- \`xla\`
- \`xls\`
- \`xlsx\`
- \`xml\`
`),
    format: z
      .enum([
        'ai',
        'csv',
        'doc',
        'docx',
        'eps',
        'gif',
        'html',
        'jpeg',
        'jpg',
        'latex',
        'oda',
        'odd',
        'odt',
        'ott',
        'pdf',
        'png',
        'pot',
        'pps',
        'ppt',
        'pptx',
        'ppz',
        'ps',
        'rtf',
        'rtx',
        'srt',
        'svg',
        'text',
        'txt',
        'vtt',
        'xhtml',
        'xla',
        'xls',
        'xlsx',
        'xml',
      ])
      .describe(`
The desired format for document conversion.
`),
    markdown_format: z
      .enum(['commonmark', 'gfm'])
      .default('gfm')
      .describe(`
Markdown can be represented in several [variants](https://www.iana.org/assignments/markdown-variants/markdown-variants.xhtml), so when using this Robot to transform Markdown into HTML please specify which revision is being used.
`),
    markdown_theme: z
      .enum(['bare', 'github'])
      .default('github')
      .describe(`
This parameter overhauls your Markdown files styling based on several canned presets.
`),
    pdf_margin: z
      .string()
      .default('6.25mm,6.25mm,14.11mm,6.25mm')
      .describe(`
PDF Paper margins, separated by \`,\` and with units.

We support the following unit values: \`px\`, \`in\`, \`cm\`, \`mm\`.

Currently this parameter is only supported when converting from \`html\`.
`),
    pdf_print_background: z
      .boolean()
      .default(true)
      .describe(`
Print PDF background graphics.

Currently this parameter is only supported when converting from \`html\`.
`),
    pdf_format: z
      .enum(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'Ledger', 'Legal', 'Letter', 'Tabloid'])
      .default('Letter')
      .describe(`
PDF paper format.

Currently this parameter is only supported when converting from \`html\`.
`),
    pdf_display_header_footer: z
      .boolean()
      .default(false)
      .describe(`
Display PDF header and footer.

Currently this parameter is only supported when converting from \`html\`.
`),
    pdf_header_template: z
      .string()
      .optional()
      .describe(`
HTML template for the PDF print header.

Should be valid HTML markup with following classes used to inject printing values into them:
- \`date\` formatted print date
- \`title\` document title
- \`url\` document location
- \`pageNumber\` current page number
- \`totalPages\` total pages in the document

Currently this parameter is only supported when converting from \`html\`, and requires \`pdf_display_header_footer\` to be enabled.

To change the formatting of the HTML element, the \`font-size\` must be specified in a wrapper. For example, to center the page number at the top of a page you'd use the following HTML for the header template:

\`\`\`html
<div style="font-size: 15px; width: 100%; text-align: center;"><span class="pageNumber"></span></div>
\`\`\`
`),
    pdf_footer_template: z
      .string()
      .optional()
      .describe(`
HTML template for the PDF print footer.

Should use the same format as the \`pdf_header_template\`.

Currently this parameter is only supported when converting from \`html\`, and requires \`pdf_display_header_footer\` to be enabled.

To change the formatting of the HTML element, the \`font-size\` must be specified in a wrapper. For example, to center the page number in the footer you'd use the following HTML for the footer template:

\`\`\`html
<div style="font-size: 15px; width: 100%; text-align: center;"><span class="pageNumber"></span></div>
\`\`\`
`),
  })
  .strict()

export const robotDocumentConvertInstructionsWithHiddenFieldsSchema =
  robotDocumentConvertInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentConvertInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentConvertInstructions = z.infer<
  typeof robotDocumentConvertInstructionsSchema
>
export type RobotDocumentConvertInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentConvertInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentConvertInstructionsSchema = interpolateRobot(
  robotDocumentConvertInstructionsSchema,
)
export type InterpolatableRobotDocumentConvertInstructions =
  InterpolatableRobotDocumentConvertInstructionsInput

export type InterpolatableRobotDocumentConvertInstructionsInput = z.input<
  typeof interpolatableRobotDocumentConvertInstructionsSchema
>

export const interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDocumentConvertInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDocumentConvertInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentConvertInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema
>
