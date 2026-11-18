import { optionalWithV3Semantics } from '../../lib/sdkZodOptional.ts'

import { z } from 'zod/v4'

// Assembly Status browser consumers must not initialize Robot instruction definitions.

/** Provider face coordinates retain optional endpoints and confidence, plus unknown fields. */
export const imageFacedetectFaceCoordinatesSchema = z
  .object({
    confidence: optionalWithV3Semantics(z.number()),
    height: z.number(),
    width: z.number(),
    x1: z.number(),
    x2: optionalWithV3Semantics(z.number()),
    y1: z.number(),
    y2: optionalWithV3Semantics(z.number()),
  })
  .catchall(z.unknown())

/** Face coordinates emitted by the AWS/GCP provider boundary. */
export type ImageFacedetectFaceCoordinates = z.infer<typeof imageFacedetectFaceCoordinatesSchema>
