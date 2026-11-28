// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { Viewer } from '../src/viewer.tsx'

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }))
vi.mock('#pdfjs', () => ({ getDocument, PDFWorker: { create: () => ({ destroy: vi.fn() }) } }))
const fetchMock = vi.fn<typeof fetch>()
const onError = vi.fn()
const container = document.createElement('div')
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', fetchMock.mockReset())
  vi.stubGlobal(
    'Worker',
    class extends EventTarget {
      terminate() {}
    },
  )
  onError.mockReset()
  getDocument.mockReset()
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  vi.unstubAllGlobals()
})
async function show(
  src = 'https://files.example/report',
  workerSrc = '/worker.mjs',
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
        unsupportedFallback="Unsupported PDF"
        loadingFallback="Opening slides"
        errorFallback="Failed to open"
      />,
    ),
  )
}

test.each([
  [403, 'application/pdf', 'forbidden'],
  [401, 'application/pdf', 'expired'],
  [200, 'application/octet-stream', 'unsupported'],
  [200, 'text/html', 'unsupported'],
  [503, 'application/pdf', 'network'],
])('checks HTTP %s and MIME %s before parsing', async (status, mime, reason) => {
  fetchMock.mockResolvedValue(
    new Response(null, { status: Number(status), headers: { 'content-type': String(mime) } }),
  )
  await show()
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(reason))
  expect(container.textContent).toBe(
    reason === 'unsupported' ? 'Unsupported PDF' : 'Failed to open',
  )
  expect(getDocument).not.toHaveBeenCalled()
})

test('rejects an untrusted worker before fetching PDF bytes', async () => {
  await show('https://files.example/report', 'https://other.example/worker.mjs')
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('unsupported'))
  expect(fetchMock).not.toHaveBeenCalled()
})

test('enforces the separate-origin policy in PDF.js mode', async () => {
  await show('/untrusted')
  expect(onError).toHaveBeenCalledWith('unsupported')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('reports a parser failure and releases the loading task before close', async () => {
  const destroy = vi.fn().mockResolvedValue(undefined)
  let respond: (value: Response) => void = () => {}
  const response = new Promise<Response>((resolve) => {
    respond = resolve
  })
  fetchMock.mockReturnValue(response)
  getDocument.mockImplementation(() => ({
    promise: Promise.reject(new Error('Invalid PDF')),
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
