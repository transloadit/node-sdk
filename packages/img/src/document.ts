import { DocumentPreviewError, readPreviewContent } from './readPreviewContent.ts'

export type { DocumentPreviewReason } from './readPreviewContent.ts'

export { DocumentPreviewError } from './readPreviewContent.ts'

/** Document formats Viewer can display without sending bytes to another service. */
export type DocumentPreviewKind = 'pdf' | 'markdown' | 'text' | 'rtf'
export type ViewerKind = DocumentPreviewKind | 'audio' | 'image' | 'video'

/** Choose a preview from catalog metadata. PDF detection alone does not authorize embedding. */
export function documentPreviewKind(
  mime: string | null | undefined,
  filename: string,
): DocumentPreviewKind | null {
  const type = mime?.split(';', 1)[0]?.trim().toLowerCase()
  if (type === 'application/pdf') return 'pdf'
  if (type === 'text/markdown' || type === 'text/x-markdown') return 'markdown'
  if (type === 'application/rtf' || type === 'text/rtf' || type === 'application/x-rtf')
    return 'rtf'
  if (
    type &&
    /^(?:text\/(?:csv|tab-separated-values|yaml|x-yaml|log)|application\/(?:json|yaml|x-yaml|[\w.+-]+\+json))$/.test(
      type,
    )
  )
    return 'text'
  if (type && type !== 'application/octet-stream' && type !== 'text/plain') return null
  if (/\.(?:md|markdown|mdown|mkdn?|mkdown|mdwn)$/i.test(filename)) return 'markdown'
  if (/\.rtf$/i.test(filename)) return 'rtf'
  if (/\.(?:txt|csv|tsv|json|log|ya?ml)$/i.test(filename) || type === 'text/plain') return 'text'
  return null
}

/** Classify media and documents consistently across lists and detail views. */
export function viewerKind(mime: string | null | undefined, filename: string): ViewerKind | null {
  const type = mime?.split(';', 1)[0]?.trim().toLowerCase()
  // Only the new classifier treats a generic-MIME PDF as a candidate. The legacy frame gate remains MIME-only.
  if ((!type || type === 'application/octet-stream') && /\.pdf$/i.test(filename)) return 'pdf'
  const family = type?.split('/')[0]
  if (mime?.includes('/') && (family === 'image' || family === 'video' || family === 'audio'))
    return family
  return documentPreviewKind(mime, filename)
}

export const MAX_DOCUMENT_PREVIEW_BYTES = 2 * 1024 * 1024
export const MAX_RICH_DOCUMENT_PREVIEW_BYTES = 256 * 1024

/** Original strict reader, including its 0.2 HTTP error categories. */
export async function readDocumentPreview(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  try {
    return (await readPreviewContent(url, signal, { limit: MAX_DOCUMENT_PREVIEW_BYTES })).bytes
  } catch (error) {
    if (error instanceof DocumentPreviewError) {
      if (error.reason === 'forbidden') throw new DocumentPreviewError('expired')
      if (error.reason === 'network') throw new DocumentPreviewError('unavailable')
    }
    throw error
  }
}

/** A Unicode BOM takes precedence over the MIME charset. Unknown labels fall back to UTF-8. */
export function decodeDocumentText(
  buffer: ArrayBuffer,
  mime?: string | null,
  truncated = false,
): string {
  const bytes = new Uint8Array(
    buffer,
    0,
    truncated ? Math.min(buffer.byteLength, MAX_DOCUMENT_PREVIEW_BYTES) : buffer.byteLength,
  )
  let encoding = /;\s*charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i
    .exec(mime ?? '')
    ?.slice(1)
    .find(Boolean)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le'
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be'
  else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) encoding = 'utf-8'
  let decoder: TextDecoder
  try {
    decoder = new TextDecoder(encoding)
  } catch {
    decoder = new TextDecoder()
  }
  // A partial multibyte character at the truncation boundary belongs to the omitted suffix.
  return decoder.decode(bytes, { stream: truncated || bytes.byteLength < buffer.byteLength })
}
