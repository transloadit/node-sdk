/**
 * Limits also arrive from JSON config files, where a value such as `"1MB"` would silently disable
 * a numeric comparison, so each one must be a positive integer.
 */
const assertPositiveInteger = (value: unknown, name: string, unit: string): void => {
  if (value === undefined) return
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer number of ${unit}.`)
  }
}

/** Validates the limits every server instance applies, however it is constructed. */
export const assertServerLimits = (options: {
  maxUrlDownloadBytes?: unknown
  urlDownloadTimeoutMs?: unknown
}): void => {
  assertPositiveInteger(options.maxUrlDownloadBytes, 'maxUrlDownloadBytes', 'bytes')
  assertPositiveInteger(options.urlDownloadTimeoutMs, 'urlDownloadTimeoutMs', 'milliseconds')
}

/** Validates the HTTP request body limit. */
export const assertRequestBodyLimit = (value: unknown): void => {
  assertPositiveInteger(value, 'maxRequestBodyBytes', 'bytes')
}
