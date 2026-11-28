export type DocumentPreviewReason =
  | 'too-large'
  | 'forbidden'
  | 'expired'
  | 'network'
  | 'parse'
  | 'unsupported'

/** Safe to display or report without leaking a signed URL or response body. */
export class DocumentPreviewError extends Error {
  readonly reason: DocumentPreviewReason | 'unavailable'

  constructor(reason: DocumentPreviewError['reason']) {
    super(`Document preview ${reason}`)
    this.reason = reason
  }
}

export interface PreviewContent {
  bytes: ArrayBuffer
  truncated: boolean
  mime: string | null
}

/** Bound the actual decoded stream even when Content-Length is absent or incorrect. */
export async function readPreviewContent(
  url: string,
  signal: AbortSignal,
  options: { limit: number; truncate?: boolean; pdf?: boolean },
): Promise<PreviewContent> {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    ...(options.pdf && { redirect: 'error' }),
  })
  const mime = response.headers.get('content-type')
  const advertised = Number(response.headers.get('content-length'))
  let reason: DocumentPreviewReason | undefined
  if (!response.ok)
    reason = response.status === 403 ? 'forbidden' : response.status === 401 ? 'expired' : 'network'
  else if (options.pdf && mime?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/pdf')
    reason = 'unsupported'
  else if (!options.truncate && advertised > options.limit) reason = 'too-large'
  if (reason) {
    await response.body?.cancel()
    throw new DocumentPreviewError(reason)
  }
  if (!response.body) throw new DocumentPreviewError('network')
  const reader = response.body.getReader()
  // An accurate Content-Length lets a large PDF go straight from one input buffer to the worker.
  const capacity =
    Number.isSafeInteger(advertised) && advertised > 0 ? Math.min(advertised, options.limit) : 0
  let bytes = new Uint8Array(capacity)
  let length = 0
  let truncated = false
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      const count = Math.min(value.byteLength, options.limit - length)
      truncated = count < value.byteLength
      if (truncated) {
        await reader.cancel()
        if (!options.truncate) throw new DocumentPreviewError('too-large')
      }
      if (length + count > bytes.length) {
        const larger = new Uint8Array(
          Math.min(options.limit, Math.max(length + count, bytes.length * 2)),
        )
        larger.set(bytes)
        bytes = larger
      }
      bytes.set(value.subarray(0, count), length)
      length += count
      if (truncated) break
    }
  } finally {
    reader.releaseLock()
  }
  return {
    bytes: length === bytes.length ? bytes.buffer : bytes.buffer.slice(0, length),
    truncated,
    mime,
  }
}
