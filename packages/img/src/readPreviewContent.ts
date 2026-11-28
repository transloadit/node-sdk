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
  let reason: DocumentPreviewReason | undefined
  if (!response.ok)
    reason = response.status === 403 ? 'forbidden' : response.status === 401 ? 'expired' : 'network'
  else if (options.pdf && mime?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/pdf')
    reason = 'unsupported'
  else if (!options.truncate && Number(response.headers.get('content-length')) > options.limit)
    reason = 'too-large'
  if (reason) {
    await response.body?.cancel()
    throw new DocumentPreviewError(reason)
  }
  if (!response.body) throw new DocumentPreviewError('network')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let truncated = false
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      const remaining = options.limit - length
      if (value.byteLength > remaining) {
        await reader.cancel()
        if (!options.truncate) throw new DocumentPreviewError('too-large')
        chunks.push(value.subarray(0, remaining))
        length = options.limit
        truncated = true
        break
      }
      chunks.push(value)
      length += value.byteLength
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { bytes: bytes.buffer, truncated, mime }
}
