import type { StoragePreviewSource, UrlImageSource } from './index.ts'

const maximumPublicUrlLength = 2048

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

/** Validates and canonicalizes one bounded, public HTTP(S) image URL without coercing its input. */
export function getCanonicalPublicImageUrl(input: unknown): string {
  if (typeof input !== 'string') {
    throw new TypeError('URL image sources must be one absolute HTTP or HTTPS URL')
  }
  if (input.length > maximumPublicUrlLength || utf8ByteLength(input) > maximumPublicUrlLength) {
    throw new TypeError(`URL image sources must be at most ${maximumPublicUrlLength} UTF-8 bytes`)
  }
  if (input.trim() !== input || input.includes('|') || !URL.canParse(input)) {
    throw new TypeError('URL image sources must be one absolute HTTP or HTTPS URL')
  }

  const url = new URL(input)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('URL image sources must be one absolute HTTP or HTTPS URL')
  }
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new TypeError(
      'URL image sources must be public URLs without credentials, query strings, or fragments',
    )
  }
  const canonicalUrl = url.href
  if (
    canonicalUrl.length > maximumPublicUrlLength ||
    utf8ByteLength(canonicalUrl) > maximumPublicUrlLength
  ) {
    throw new TypeError(
      `URL image sources must be at most ${maximumPublicUrlLength} UTF-8 bytes after canonicalization`,
    )
  }
  return canonicalUrl
}

/** Copies a discriminated image source before validation or asynchronous rendering can observe it. */
export function snapshotImageSource(
  source: StoragePreviewSource | UrlImageSource,
): StoragePreviewSource | UrlImageSource {
  const sourceType: unknown = source.type
  if (sourceType === 'url' && 'url' in source) {
    return {
      height: source.height,
      type: 'url',
      url: source.url,
      width: source.width,
    }
  }
  if (sourceType === 'storage' && 'path' in source) {
    return { path: source.path, type: 'storage' }
  }
  throw new TypeError(`Unsupported image source type: ${String(sourceType)}`)
}
