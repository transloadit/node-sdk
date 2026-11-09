import { z } from 'zod'

/** An OCR polygon vertex in pixel coordinates. Provider omissions belong at the property site. */
export const ocrBoundingVertexSchema = z.object({ x: z.number(), y: z.number() })

/** Complete OCR text and pixel coordinates shared by image/document result projections. */
export const ocrTextWithPolygonSchema = z.object({
  text: z.string(),
  boundingPolygon: z.array(ocrBoundingVertexSchema),
})

/** Full-granularity OCR JSON projection requiring complete polygons. */
export const ocrFullOutputSchema = z.array(ocrTextWithPolygonSchema)

/** The list-granularity OCR result used by both AWS and GCP. */
export const ocrTextListSchema = z.array(z.string())

/** A list-granularity metadata projection with recognized text required. */
export const ocrTextListMetaSchema = z.object({ recognized_text: ocrTextListSchema })
