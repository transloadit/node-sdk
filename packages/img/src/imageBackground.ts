/** Fully transparent background supported by the Storage preview pipeline. */
export const transparentImageBackground = '#00000000'

/** JPEG requires an opaque six-digit RGB color or eight-digit RGBA color ending in ff. */
export function isOpaqueImageBackground(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && /^#[0-9a-f]{6}(?:ff)?$/i.test(value)
}
