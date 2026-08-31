const maximumStoragePathLength = 1024
const invalidUnicodePattern = /[\p{Cc}\p{Cs}]/u

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function exceedsMaximumStoragePathLength(value: string): boolean {
  return value.length > maximumStoragePathLength || utf8ByteLength(value) > maximumStoragePathLength
}

function hasAmbiguousSegments(path: string): boolean {
  // A percent escape is literal object-key text here: signing encodes `%`, and API2 decodes the
  // Smart CDN route exactly once before matching the same catalog path.
  return (
    path.includes('\\') || path.split('/').some((segment) => segment === '.' || segment === '..')
  )
}

function hasInvalidSegments(path: string): boolean {
  return path.split('/').some((segment) => segment === '' || segment.trim() === '')
}

/** Validates one object path before it reaches signing or an authorization-prefix comparison. */
export function validateStoragePath(path: string): void {
  if (typeof path !== 'string') {
    throw new TypeError(
      'Storage image paths must be non-empty relative strings without surrounding whitespace',
    )
  }
  if (exceedsMaximumStoragePathLength(path)) {
    throw new TypeError('Storage image paths must be at most 1024 UTF-8 bytes')
  }
  if (path === '' || path.trim() !== path || path.startsWith('/')) {
    throw new TypeError(
      'Storage image paths must be non-empty relative strings without surrounding whitespace',
    )
  }
  if (hasAmbiguousSegments(path)) {
    throw new TypeError('Storage image paths must not contain dot segments or backslashes')
  }
  if (
    path.normalize('NFC') !== path ||
    invalidUnicodePattern.test(path) ||
    hasInvalidSegments(path)
  ) {
    throw new TypeError('Storage image paths must use normalized, non-empty path segments')
  }
}

/** Validates one directory-boundary prefix; an empty prefix explicitly allows the workspace root. */
export function validateStoragePathPrefix(prefix: string, index: number): void {
  if (prefix === '') return
  if (
    typeof prefix !== 'string' ||
    prefix.trim() !== prefix ||
    prefix.startsWith('/') ||
    !prefix.endsWith('/') ||
    exceedsMaximumStoragePathLength(prefix) ||
    prefix.normalize('NFC') !== prefix ||
    invalidUnicodePattern.test(prefix) ||
    hasAmbiguousSegments(prefix) ||
    hasInvalidSegments(prefix.slice(0, -1))
  ) {
    throw new TypeError(
      `storage.allowedPathPrefixes[${index}] must be empty or one safe relative prefix ending in /`,
    )
  }
}
