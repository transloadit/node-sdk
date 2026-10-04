/** A plain object; arrays are rejected because callers read named fields. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Parses JSON text, returning `undefined` for empty or invalid input instead of throwing. */
export const parseJson = (text: string): unknown => {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
