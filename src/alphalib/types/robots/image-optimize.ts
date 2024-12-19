import { z } from 'zod'

import { optimize_priority, useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  docs_redirect_from: ['/docs/image-optimization/'],
  example_code: {
    steps: {
      optimized: {
        robot: '/image/optimize',
        use: ':original',
      },
    },
  },
  example_code_description: 'Optimize uploaded images:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Image Manipulation',
  purpose_sentence: 'reduces the size of images while maintaining the same visual quality',
  purpose_verb: 'optimize',
  purpose_word: 'optimize',
  purpose_words: 'Optimize images without quality loss',
  service_slug: 'image-manipulation',
  slot_count: 15,
  title: 'Optimize images without quality loss',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
}

export const robotImageOptimizeInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/image/optimize'),
    use: useParamSchema,
    priority: optimize_priority.describe(`
Provides different algorithms for better or worse compression for your images, but that run slower or faster. The value \`"conversion-speed"\` will result in an average compression ratio of 18%. \`"compression-ratio"\` will result in an average compression ratio of 31%.
`),
    progressive: z.boolean().default(false).describe(`
Interlaces the image if set to \`true\`, which makes the result image load progressively in browsers. Instead of rendering the image from top to bottom, the browser will first show a low-res blurry version of the image which is then quickly replaced with the actual image as the data arrives. This greatly increases the user experience, but comes at a loss of about 10% of the file size reduction.
`),
    preserve_meta_data: z.boolean().default(true).describe(`
Specifies if the image's metadata should be preserved during the optimization, or not. If it is not preserved, the file size is even further reduced. But be aware that this could strip a photographer's copyright information, which for obvious reasons can be frowned upon.
`),
    fix_breaking_images: z.boolean().default(true).describe(`
If set to \`true\` this parameter tries to fix images that would otherwise make the underlying tool error out and thereby break your <dfn>Assemblies</dfn>. This can sometimes result in a larger file size, though.
`),
  })
  .strict()
export type RobotImageOptimizeInstructions = z.infer<typeof robotImageOptimizeInstructionsSchema>
