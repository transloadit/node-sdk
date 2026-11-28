import type { DocumentPreviewReason } from './readPreviewContent.ts'

import { previewDeadline } from './previewDeadline.ts'
import { DocumentPreviewError } from './readPreviewContent.ts'

type PdfGrant = { mediaUrl?: string; expiresAt?: number }
export type RenewPdf = (signal: AbortSignal) => Promise<PdfGrant | undefined>

interface NetworkOptions {
  src: string
  filename?: string
  expiresAt?: number
  renew?: RenewPdf
  renewFirst?: 'expired' | 'forbidden'
  timeoutMs?: number
  signal: AbortSignal
  fail: (reason: DocumentPreviewReason) => void
}

const requests = new Map<string, (headers: Headers, signal: AbortSignal) => Promise<Response>>()
const sessionHeader = 'X-TL-Viewer-Session'
const maxBytes = 64 * 1024 * 1024
let sequence = 0

/** Module-local fetch binding in the packaged PDF.js build. Only document requests carry the session header. */
export function fetchPdfResource(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const session = headers.get(sessionHeader)
  if (!session) return globalThis.fetch(input, init)
  headers.delete(sessionHeader)
  const request = requests.get(session)
  if (!request || !init?.signal)
    return Promise.reject(new DOMException('Preview closed', 'AbortError'))
  return request(headers, init.signal)
}

/** Keep PDF.js in control of range selection, progressive reads and cancellation on a version-bound grant. */
export function openPdfNetwork(options: NetworkOptions): Record<string, string> {
  const id = String(++sequence)
  const initial = new URL(options.src)
  let grant = { mediaUrl: initial.href, expiresAt: options.expiresAt }
  let etag: string | null = null
  let renewFirst = options.renewFirst
  let renewal: Promise<typeof grant> | undefined
  const octetPdf = /\.pdf$/i.test(options.filename ?? initial.pathname)
  const expired = (): boolean =>
    grant.expiresAt !== undefined && grant.expiresAt <= Date.now() + 5_000

  async function refresh(reason: DocumentPreviewReason): Promise<typeof grant> {
    const deadline = previewDeadline(options.signal, options.timeoutMs)
    try {
      const answer = options.renew && (await deadline.wait(options.renew(deadline.signal)))
      deadline.signal.throwIfAborted()
      if (!answer?.mediaUrl) throw new DocumentPreviewError(reason)
      const url = URL.parse(answer.mediaUrl, initial)
      if (!url || url.origin !== initial.origin || !['http:', 'https:'].includes(url.protocol))
        throw new DocumentPreviewError('invalid-url')
      grant = { mediaUrl: url.href, expiresAt: answer.expiresAt }
      if (expired()) throw new DocumentPreviewError('expired')
      return grant
    } finally {
      deadline.dispose()
    }
  }
  function fresh(reason: DocumentPreviewReason): Promise<typeof grant> {
    renewal ??= refresh(reason).finally(() => {
      renewal = undefined
    })
    return renewal
  }
  async function request(headers: Headers, parent: AbortSignal): Promise<Response> {
    const deadline = previewDeadline(AbortSignal.any([parent, options.signal]), options.timeoutMs)
    const { signal } = deadline
    function failed(error: unknown): void {
      if (parent.aborted || options.signal.aborted) return
      options.fail(
        error instanceof DocumentPreviewError && error.reason !== 'unavailable'
          ? error.reason
          : 'network',
      )
    }
    signal.addEventListener('abort', () => failed(undefined), { once: true })
    const get = (url: string): Promise<Response> =>
      globalThis.fetch(url, {
        headers,
        signal,
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      })
    try {
      const denied = renewFirst
      renewFirst = undefined
      const before = denied || expired()
      const current = before || renewal ? await fresh(denied ?? 'expired') : grant
      signal.throwIfAborted()
      let response = await get(current.mediaUrl)
      if (!before && options.renew && (response.status === 401 || response.status === 403)) {
        await response.body?.cancel()
        const next =
          grant === current ? await fresh(response.status === 401 ? 'expired' : 'forbidden') : grant
        signal.throwIfAborted()
        response = await get(next.mediaUrl)
      }
      const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
      const range = /^bytes=(\d+)-(\d+)$/.exec(headers.get('Range') ?? '')
      const responseTag = response.headers.get('etag')
      const contentRange = response.headers.get('content-range')
      const rangeLength = range ? Number(range[2]) - Number(range[1]) + 1 : undefined
      let reason: DocumentPreviewReason | undefined
      if (!response.ok)
        reason =
          response.status === 401 ? 'expired' : response.status === 403 ? 'forbidden' : 'network'
      else if (type !== 'application/pdf' && !(octetPdf && type === 'application/octet-stream'))
        reason = 'invalid-mime'
      else if (
        Number(response.headers.get('content-length')) > maxBytes ||
        Number(response.headers.get('content-range')?.split('/')[1]) > maxBytes
      )
        reason = 'too-large'
      else if (
        range &&
        (response.status !== 206 ||
          (contentRange !== null && !contentRange.startsWith(`bytes ${range[1]}-${range[2]}/`)))
      )
        reason = 'network'
      else if (etag && responseTag && etag !== responseTag) reason = 'network'
      if (reason || !response.body) {
        await response.body?.cancel()
        throw new DocumentPreviewError(reason ?? 'network')
      }
      etag ??= responseTag
      // Forward one chunk at a time, preserving PDF.js backpressure and its response-origin check.
      const reader = response.body.getReader()
      let size = 0
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            deadline.reset()
            const chunk = await reader.read()
            if (chunk.done) {
              if (rangeLength !== undefined && size !== rangeLength)
                throw new DocumentPreviewError('network')
              deadline.dispose()
              controller.close()
              return
            }
            size += chunk.value.byteLength
            if (rangeLength !== undefined && size > rangeLength)
              throw new DocumentPreviewError('network')
            if (size > maxBytes) throw new DocumentPreviewError('too-large')
            controller.enqueue(chunk.value)
          } catch (error) {
            deadline.dispose()
            failed(error)
            controller.error(error)
            await reader.cancel().catch(() => {})
          }
        },
        cancel() {
          deadline.dispose()
          return reader.cancel()
        },
      })
      const monitored = new Response(body, { headers: response.headers, status: response.status })
      Object.defineProperty(monitored, 'url', { value: response.url })
      return monitored
    } catch (error) {
      deadline.dispose()
      failed(error)
      throw error
    }
  }
  requests.set(id, request)
  options.signal.addEventListener('abort', () => requests.delete(id), { once: true })
  return { [sessionHeader]: id }
}
