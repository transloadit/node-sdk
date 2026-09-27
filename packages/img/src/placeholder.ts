import type { TransloaditImageSource } from './imageSource.ts'

import { thumbHashToDataURL } from 'thumbhash'

/** Decode bounded, normalized receipt metadata only when the caller may expose its pixels. */
export function createBlurDataURL(
  source: TransloaditImageSource,
  inlinePixels = true,
): string | undefined {
  const hash = source.thumbhash
  // Hand-edited receipts are untrusted. Check padding before atob, then canonical spelling.
  const decoded =
    inlinePixels &&
    typeof hash === 'string' &&
    hash.length <= 48 &&
    hash.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(hash)
      ? atob(hash)
      : undefined
  const bytes =
    decoded === undefined ? undefined : Uint8Array.from(decoded, (byte) => byte.charCodeAt(0))
  // The encoded alpha bit protects even receipts that lost their original alpha metadata.
  const hasAlpha = source.hasAlpha === true || ((bytes?.[2] ?? 0) & 0x80) !== 0
  if (
    !hasAlpha &&
    bytes !== undefined &&
    decoded !== undefined &&
    bytes.length >= 17 &&
    bytes.length <= 25 &&
    btoa(decoded) === hash &&
    ((bytes[3] ?? 0) & 7) > 0
  )
    return thumbHashToDataURL(bytes)

  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn(
      !inlinePixels
        ? `[Image] ${JSON.stringify(source.path)} uses request-authorized private delivery; placeholder="blur" is a no-op so its pixels are not exposed before authorization.`
        : hasAlpha
          ? `[Image] ${JSON.stringify(source.path)}: transparent image: no blur placeholder.`
          : `[Image] ${JSON.stringify(source.path)} has no usable thumbhash; placeholder="blur" is a no-op. For new uploads, request storage store --placeholder blur or output_meta.thumbhash on the producing Step. Use storage receipts sync to recover metadata already on the server; sync cannot generate a missing hash.`,
    )
  }
  return undefined
}
