import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 20,
  discount_factor: 0.05,
  discount_pct: 95,
  minimum_charge: 102400,
  output_factor: 1,
  override_lvl1: 'Content Delivery',
  purpose_sentence: 'caches and delivers files globally',
  purpose_verb: 'cache & deliver',
  purpose_word: 'Cache and deliver files',
  purpose_words: 'Cache and deliver files globally',
  service_slug: 'content-delivery',
  slot_count: 0,
  title: 'Cache and deliver files globally',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotTlcdnDeliverInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/tlcdn/deliver').describe(`
When you want Transloadit to tranform files on the fly, this <dfn>Robot</dfn> can cache and deliver the results close to your end-user, saving on latency and encoding volume. The use of this <dfn>Robot</dfn> is implicit when you use the <code>tlcdn.com</code> domain.
`),
  })
  .strict()

export type RobotTlcdnDeliverInstructions = z.infer<typeof robotTlcdnDeliverInstructionsSchema>
