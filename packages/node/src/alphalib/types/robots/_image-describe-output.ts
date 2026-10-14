import { z } from 'zod'

// Assembly Status browser consumers must not initialize Robot instruction definitions.

/** An AWS/GCP full-granularity image description, including explicit-content labels. */
export const imageDescribeLabelSchema = z.object({
  name: z.string(),
  confidence: z.number(),
})

/** Full-granularity JSON output from image description providers. */
export const imageDescribeFullOutputSchema = z.array(imageDescribeLabelSchema)

/** Full-granularity metadata projection with descriptions required. */
export const imageDescribeFullMetaSchema = z.object({
  descriptions: imageDescribeFullOutputSchema,
})

/** List-granularity metadata projection with description names required. */
export const imageDescribeListMetaSchema = z.object({ descriptions: z.array(z.string()) })
