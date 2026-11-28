// @vitest-environment happy-dom

import type { PdfViewerProps } from '../src/pdfViewer.tsx'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { fetchPdfResource, openPdfNetwork } from '../src/pdfNetwork.ts'
import { Viewer } from '../src/viewer.tsx'

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }))
vi.mock('#pdfjs', () => ({ getDocument, PDFWorker: { create: () => ({ destroy: vi.fn() }) } }))
const fetchMock = vi.fn<typeof fetch>()
const onError = vi.fn()
const container = document.createElement('div')
let root: ReturnType<typeof createRoot>
let worker: EventTarget
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', fetchMock.mockReset())
  vi.stubGlobal(
    'Worker',
    class extends EventTarget {
      constructor() {
        super()
        worker = this
      }
      terminate() {}
    },
  )
  onError.mockReset()
  getDocument.mockReset().mockImplementation(({ url, httpHeaders }) => ({
    promise: fetchPdfResource(url, {
      headers: httpHeaders,
      signal: new AbortController().signal,
    }).then(() => {
      throw new Error('Invalid PDF')
    }),
    destroy: () => Promise.resolve(),
  }))
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  vi.unstubAllGlobals()
})
async function show(
  src = 'https://files.example/report',
  workerSrc = '/worker.mjs',
  options: Partial<PdfViewerProps> = {},
): Promise<void> {
  await act(() =>
    root.render(
      <Viewer
        kind="pdf"
        mode="pdfjs"
        title="Slides"
        src={src}
        workerSrc={workerSrc}
        onError={onError}
        loadingFallback="Opening slides"
        errorFallback="Failed to open"
        {...options}
      />,
    ),
  )
}

test.each([
  [403, 'application/pdf', 'forbidden'],
  [401, 'application/pdf', 'expired'],
  [200, 'application/octet-stream', 'invalid-mime'],
  [200, 'text/html', 'invalid-mime'],
  [503, 'application/pdf', 'network'],
])('checks HTTP %s and MIME %s before parsing', async (status, mime, reason) => {
  fetchMock.mockResolvedValue(
    new Response(null, { status: Number(status), headers: { 'content-type': String(mime) } }),
  )
  await show()
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(reason))
  expect(container.textContent).toBe('Failed to open')
})

test('rejects an untrusted worker before fetching PDF bytes', async () => {
  await show('https://files.example/report', 'https://other.example/worker.mjs')
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('invalid-url'))
  expect(fetchMock).not.toHaveBeenCalled()
})

test('enforces the separate-origin policy in PDF.js mode', async () => {
  await show('/untrusted')
  expect(onError).toHaveBeenCalledWith('invalid-url')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('reports a parser failure and releases the loading task before close', async () => {
  const destroy = vi.fn().mockResolvedValue(undefined)
  let respond: (value: Response) => void = () => {}
  const response = new Promise<Response>((resolve) => {
    respond = resolve
  })
  fetchMock.mockReturnValue(response)
  getDocument.mockImplementation(({ url, httpHeaders }) => ({
    promise: fetchPdfResource(url, {
      headers: httpHeaders,
      signal: new AbortController().signal,
    }).then(() => {
      throw new Error('Invalid PDF')
    }),
    destroy,
  }))
  await show()
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  expect(container.textContent).toBe('Opening slides')
  await act(async () => {
    respond(new Response('invalid', { headers: { 'content-type': 'application/pdf' } }))
    await response
  })
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('parse'))
  expect(fetchMock).toHaveBeenCalledWith(
    'https://files.example/report',
    expect.objectContaining({
      redirect: 'error',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }),
  )
  expect(destroy).toHaveBeenCalledOnce()
  await act(() => root.render(null))
  expect(destroy).toHaveBeenCalledOnce()
})

test('fetches document-relative sources against the page base URI', async () => {
  vi.spyOn(document, 'baseURI', 'get').mockReturnValue(new URL('/reports/', location.href).href)
  fetchMock.mockResolvedValue(new Response(null, { status: 403 }))
  await act(() =>
    root.render(
      <Viewer
        kind="pdf"
        mode="pdfjs"
        allowSameOrigin
        src="slides.pdf"
        title="Slides"
        onError={onError}
      />,
    ),
  )
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('forbidden'))
  expect(fetchMock).toHaveBeenCalledWith(
    new URL('/reports/slides.pdf', location.href).href,
    expect.anything(),
  )
  vi.restoreAllMocks()
})

test('a worker error wins over the subsequent parser rejection', async () => {
  let rejectTask: (reason: Error) => void = () => {}
  const promise = new Promise<never>((_, reject) => {
    rejectTask = reject
  })
  getDocument.mockReturnValue({ promise, destroy: () => Promise.resolve() })
  await show()
  await vi.waitFor(() => expect(getDocument).toHaveBeenCalledOnce())
  await act(async () => {
    worker.dispatchEvent(new Event('error'))
    rejectTask(new Error('Worker lost during parsing'))
    await promise.catch(() => {})
  })
  expect(onError.mock.calls).toEqual([['network']])
})

test('a manual retry obtains a new grant before fetching again', async () => {
  const renew = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ mediaUrl: 'https://files.example/renewed' })
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: 403 }))
    .mockResolvedValueOnce(
      new Response('invalid', { headers: { 'Content-Type': 'application/pdf' } }),
    )
  await show(undefined, undefined, {
    renew,
    renderError: (reason, retry) => (
      <button type="button" onClick={retry}>
        {reason}
      </button>
    ),
  })
  await vi.waitFor(() => expect(container.textContent).toBe('forbidden'))
  await act(() => container.querySelector('button')?.click())
  await vi.waitFor(() => expect(container.textContent).toBe('parse'))
  expect(renew).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    'https://files.example/report',
    'https://files.example/renewed',
  ])
})

test.each([
  401, 403,
])('concurrent requests share a renewal even when it returns HTTP %s', async (status) => {
  const mediaUrl = 'https://files.example/slides'
  const renewedUrl = `${mediaUrl}?renewed`
  const grant = { mediaUrl }
  const controller = new AbortController()
  let resolveGrant: (grant: { mediaUrl: string }) => void = () => {}
  const renew = vi.fn(
    () =>
      new Promise<{ mediaUrl: string }>((resolve) => {
        resolveGrant = resolve
      }),
  )
  const network = await openPdfNetwork({
    getGrant: () => grant,
    getRenew: () => renew,
    allowSameOrigin: false,
    signal: controller.signal,
    fail: vi.fn(),
  })
  fetchMock.mockImplementation(async () => new Response(null, { status }))
  const fetchRange = (range: string) =>
    fetchPdfResource(network.url, {
      headers: { ...network.httpHeaders, Range: range },
      signal: controller.signal,
    })
  try {
    const first = fetchRange('bytes=0-99')
    await vi.waitFor(() => expect(renew).toHaveBeenCalledOnce())
    const second = fetchRange('bytes=100-199')
    resolveGrant({ mediaUrl: renewedUrl })
    const results = await Promise.allSettled([first, second])
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected'])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([mediaUrl, renewedUrl, renewedUrl])
    expect(renew).toHaveBeenCalledOnce()
  } finally {
    controller.abort()
  }
})

test('rejects a lazy grant for the application origin before fetching', async () => {
  await show(undefined, undefined, {
    src: undefined,
    renew: async () => ({ mediaUrl: '/private' }),
  })
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('invalid-url'))
  expect(fetchMock).not.toHaveBeenCalled()
})

test('replays an in-flight denied request with a rotated prop grant without a renew callback', async () => {
  let grant = { mediaUrl: 'https://files.example/old' }
  const controller = new AbortController()
  const network = await openPdfNetwork({
    getGrant: () => grant,
    getRenew: () => undefined,
    allowSameOrigin: false,
    signal: controller.signal,
    fail: vi.fn(),
  })
  fetchMock
    .mockImplementationOnce(() => {
      grant = { mediaUrl: 'https://files.example/rotated' }
      return Promise.resolve(new Response(null, { status: 403 }))
    })
    .mockResolvedValueOnce(new Response('pdf', { headers: { 'Content-Type': 'application/pdf' } }))
  try {
    const response = await fetchPdfResource(network.url, {
      headers: network.httpHeaders,
      signal: controller.signal,
    })
    expect(await response.text()).toBe('pdf')
    expect(fetchMock.mock.lastCall?.[0]).toBe(grant.mediaUrl)
  } finally {
    controller.abort()
  }
})
