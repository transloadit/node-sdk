import type { DocumentPreviewReason } from './readPreviewContent.ts'

import { pdfUrl } from './pdfUrl.ts'
import { previewDeadline } from './previewDeadline.ts'
import { DocumentPreviewError } from './readPreviewContent.ts'

type ActiveGrant = { url: URL; expiresAt?: number }
type PdfGrant = { mediaUrl?: string; expiresAt?: number }
export type RenewPdf = (signal: AbortSignal) => Promise<PdfGrant | undefined>

interface NetworkOptions {
  getGrant: () => PdfGrant
  allowSameOrigin: boolean
  filename?: string
  getRenew: () => RenewPdf | undefined
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
export async function openPdfNetwork(options: NetworkOptions): Promise<{
  url: string
  httpHeaders: Record<string, string>
}> {
  const id = String(++sequence)
  let supplied = options.getGrant()
  let origin: string | undefined
  function validate(source: PdfGrant, base: string): ActiveGrant {
    const url = pdfUrl(source.mediaUrl, base)
    if (
      !url ||
      (origin && origin !== url.origin) ||
      (!options.allowSameOrigin && url.origin === location.origin)
    )
      throw new DocumentPreviewError('invalid-url')
    origin = url.origin
    return { url, expiresAt: source.expiresAt }
  }
  let grant = supplied.mediaUrl === undefined ? undefined : validate(supplied, document.baseURI)
  let etag: string | null = null
  let renewal: Promise<ActiveGrant> | undefined
  function currentGrant(): ActiveGrant | undefined {
    const latest = options.getGrant()
    if (latest !== supplied) {
      if (latest.mediaUrl !== undefined) grant = validate(latest, document.baseURI)
      supplied = latest
    }
    return grant
  }
  const expired = (value: { expiresAt?: number }): boolean =>
    value.expiresAt !== undefined && value.expiresAt <= Date.now() + 5_000

  async function refresh(reason: DocumentPreviewReason): Promise<ActiveGrant> {
    const deadline = previewDeadline(options.signal, options.timeoutMs)
    try {
      const before = currentGrant()
      const renew = options.getRenew()
      const answer = renew && (await deadline.wait(renew(deadline.signal)))
      deadline.signal.throwIfAborted()
      const latest = currentGrant()
      if (latest && latest !== before && !expired(latest)) return latest
      if (!answer?.mediaUrl) throw new DocumentPreviewError(reason)
      if (expired(answer)) throw new DocumentPreviewError('expired')
      grant = validate(answer, grant?.url.href ?? document.baseURI)
      return grant
    } finally {
      deadline.dispose()
    }
  }
  function fresh(reason: DocumentPreviewReason): Promise<ActiveGrant> {
    renewal ??= refresh(reason).finally(() => {
      renewal = undefined
    })
    return renewal
  }
  const renewedOnOpen = !!options.renewFirst || !grant || expired(grant)
  const initial =
    grant && !renewedOnOpen
      ? grant
      : await fresh(options.renewFirst ?? (grant ? 'expired' : 'forbidden'))
  options.signal.throwIfAborted()
  const octetPdf = /\.pdf$/i.test(options.filename ?? initial.url.pathname)
  let firstRead = true

  async function request(headers: Headers, parent: AbortSignal): Promise<Response> {
    const deadline = previewDeadline([parent, options.signal], options.timeoutMs)
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
      const suppliedGrant = currentGrant()
      const pending = renewal
      const needsGrant = !suppliedGrant || expired(suppliedGrant)
      const refreshed = !!pending || needsGrant || (firstRead && renewedOnOpen)
      firstRead = false
      const current = pending ? await pending : needsGrant ? await fresh('expired') : suppliedGrant
      signal.throwIfAborted()
      let response = await get(current.url.href)
      if (response.status === 401 || response.status === 403) {
        const latest = currentGrant()
        const replacement =
          latest && latest !== current && !expired(latest)
            ? latest
            : !refreshed && options.getRenew()
              ? fresh(response.status === 401 ? 'expired' : 'forbidden')
              : undefined
        if (replacement) {
          const [next] = await Promise.all([replacement, response.body?.cancel()])
          signal.throwIfAborted()
          response = await get(next.url.href)
        }
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
  return { url: initial.url.href, httpHeaders: { [sessionHeader]: id } }
}
