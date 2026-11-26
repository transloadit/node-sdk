import { z } from 'zod'

/** An OCR polygon vertex in pixel coordinates. Provider omissions belong at the property site. */
export const ocrBoundingVertexSchema = z.object({ x: z.number(), y: z.number() })

// AWS document OCR reports what an entry covers, so that the entries of one page (the page
// itself, then its lines, then the words of those lines) can be told apart.
const ocrBlockTypeSchema = z.enum(['page', 'line', 'word'])

/** Complete OCR text and pixel coordinates shared by image/document result projections. */
export const ocrTextWithPolygonSchema = z.object({
  text: z.string(),
  boundingPolygon: z.array(ocrBoundingVertexSchema),
  type: ocrBlockTypeSchema.optional(),
})

/** Full-granularity OCR JSON projection requiring complete polygons. */
export const ocrFullOutputSchema = z.array(ocrTextWithPolygonSchema)

/** The list-granularity OCR result used by both AWS and GCP. */
export const ocrTextListSchema = z.array(z.string())

/** A list-granularity metadata projection with recognized text required. */
export const ocrTextListMetaSchema = z.object({ recognized_text: ocrTextListSchema })
