/** Document formats Viewer can display without sending bytes to another service. */
export type DocumentPreviewKind = 'pdf' | 'markdown' | 'text' | 'rtf'

/** Catalog MIME wins; filename fallback applies only to missing or generic text/binary metadata. */
export function documentPreviewKind(
  mime: string | null,
  filename: string,
): DocumentPreviewKind | null {
  const type = mime?.split(';', 1)[0]?.trim().toLowerCase() ?? null
  if (type === 'application/pdf') return 'pdf'
  if (type === 'text/markdown' || type === 'text/x-markdown') return 'markdown'
  if (type === 'application/rtf' || type === 'text/rtf' || type === 'application/x-rtf')
    return 'rtf'
  if (type !== null && type !== 'application/octet-stream' && type !== 'text/plain') return null
  const extension = filename.split('.').at(-1)?.toLowerCase()
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (extension === 'rtf') return 'rtf'
  if (extension === 'txt' || type === 'text/plain') return 'text'
  return null
}

/** Text previews stay bounded even when an origin omits or misreports Content-Length. */
export const MAX_DOCUMENT_PREVIEW_BYTES = 2 * 1024 * 1024

/** Rich document parsers keep a smaller bound than literal text. */
export const MAX_RICH_DOCUMENT_PREVIEW_BYTES = 256 * 1024

/** Safe error categories; signed URLs and response bodies are never shown in UI errors. */
export class DocumentPreviewError extends Error {
  readonly reason: 'too-large' | 'expired' | 'unavailable'

  constructor(reason: DocumentPreviewError['reason']) {
    super(`Document preview ${reason}`)
    this.reason = reason
  }
}

/** Fetch only an already-authorized CDN URL, aborting oversized responses before buffering them. */
export async function readDocumentPreview(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) {
    await response.body?.cancel()
    throw new DocumentPreviewError(
      response.status === 401 || response.status === 403 ? 'expired' : 'unavailable',
    )
  }
  if (Number(response.headers.get('content-length')) > MAX_DOCUMENT_PREVIEW_BYTES) {
    await response.body?.cancel()
    throw new DocumentPreviewError('too-large')
  }
  if (response.body === null) throw new DocumentPreviewError('unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_DOCUMENT_PREVIEW_BYTES) {
        await reader.cancel()
        throw new DocumentPreviewError('too-large')
      }
      chunks.push(value)
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
  return bytes.buffer
}

/** Preserve UTF-8 and Unicode text exports with a UTF-16 byte-order mark. */
export function decodeDocumentText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe
      ? 'utf-16le'
      : bytes[0] === 0xfe && bytes[1] === 0xff
        ? 'utf-16be'
        : 'utf-8'
  return new TextDecoder(encoding).decode(bytes)
}
