import { z } from 'zod'

// Assembly Status browser consumers must not initialize Robot instruction definitions.

/** Provider face coordinates retain optional endpoints and confidence, plus unknown fields. */
export const imageFacedetectFaceCoordinatesSchema = z
  .object({
    confidence: z.number().optional(),
    height: z.number(),
    width: z.number(),
    x1: z.number(),
    x2: z.number().optional(),
    y1: z.number(),
    y2: z.number().optional(),
  })
  .passthrough()

/** Face coordinates emitted by the AWS/GCP provider boundary. */
export type ImageFacedetectFaceCoordinates = z.infer<typeof imageFacedetectFaceCoordinatesSchema>
