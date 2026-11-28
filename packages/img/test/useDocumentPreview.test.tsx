// @vitest-environment happy-dom

import type { DocumentPreview, DocumentPreviewOptions } from '../src/useDocumentPreview.ts'

import { act, createRef, useImperativeHandle } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useDocumentPreview } from '../src/useDocumentPreview.ts'

const source = {
  asset_id: 'notes',
  version_id: 'v1',
  mediaUrl: 'https://files.example/v1',
  expiresAt: Number.POSITIVE_INFINITY,
}
const preview = createRef<DocumentPreview>()
const fetchMock = vi.fn<typeof fetch>()
let root: ReturnType<typeof createRoot>

function Controls(props: DocumentPreviewOptions) {
  const state = useDocumentPreview(props)
  useImperativeHandle(preview, () => state)
  return null
}
async function mount(options: Partial<DocumentPreviewOptions> = {}): Promise<void> {
  await act(() => root.render(<Controls source={source} format="text" {...options} />))
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', fetchMock.mockReset())
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(() => root.unmount())
  vi.unstubAllGlobals()
})

test('loads only on open, exposes charset and cancels excess bytes', async () => {
  const cancel = vi.fn()
  const limit = 2 * 1024 * 1024
  fetchMock.mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(limit + 1))
        },
        cancel,
      }),
      { headers: { 'content-type': 'text/csv; charset=windows-1252' } },
    ),
  )
  await mount({ size: limit + 1 })
  expect(preview.current?.status).toBe('idle')
  expect(fetchMock).not.toHaveBeenCalled()
  await act(() => preview.current?.open())
  expect(preview.current).toMatchObject({
    status: 'ready',
    truncated: true,
    reason: null,
    mime: 'text/csv; charset=windows-1252',
  })
  expect(preview.current?.bytes?.byteLength).toBe(limit)
  expect(cancel).toHaveBeenCalledOnce()
  await act(() => preview.current?.close())
  expect(preview.current).toMatchObject({ status: 'idle', bytes: null })
})

test.each([
  [401, 'expired'],
  [403, 'forbidden'],
  [500, 'network'],
])('reports HTTP %s and retries', async (status, reason) => {
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: Number(status) }))
    .mockResolvedValueOnce(new Response('again'))
  await mount()
  await act(() => preview.current?.open())
  expect(preview.current).toMatchObject({ status: 'error', reason })
  await act(() => preview.current?.retry())
  expect(preview.current?.status).toBe('ready')
})

test('renews one rejected grant for the same version', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: 403 }))
    .mockResolvedValueOnce(new Response('fresh'))
  const renew = vi.fn().mockResolvedValue({ ...source, mediaUrl: 'https://files.example/fresh' })
  await mount({ renew })
  await act(() => preview.current?.open())
  expect(fetchMock).toHaveBeenLastCalledWith('https://files.example/fresh', expect.anything())
  expect(preview.current?.status).toBe('ready')
  expect(renew).toHaveBeenCalledOnce()
})

test('refuses a replacement version when an expired grant is renewed', async () => {
  await mount({
    source: { ...source, expiresAt: 0 },
    renew: async () => ({ ...source, version_id: 'v2' }),
  })
  await act(() => preview.current?.open())
  expect(preview.current?.reason).toBe('forbidden')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('aborts and ignores an old read on selection change', async () => {
  let respond: (value: Response) => void = () => {}
  const response = new Promise<Response>((resolve) => {
    respond = resolve
  })
  fetchMock.mockReturnValue(response)
  await mount()
  let request: Promise<void> | undefined
  await act(() => {
    request = preview.current?.open()
  })
  expect(preview.current?.status).toBe('loading')
  const signal = fetchMock.mock.calls[0]?.[1]?.signal
  await mount({ source: { ...source, asset_id: 'other' } })
  expect(signal?.aborted).toBe(true)
  await act(async () => {
    respond(new Response('stale'))
    await request
  })
  expect(preview.current).toMatchObject({ status: 'idle', bytes: null })
})

test('rejects a known oversized RTF before download', async () => {
  await mount({ size: 300_000, format: 'rtf' })
  await act(() => preview.current?.open())
  expect(preview.current?.reason).toBe('too-large')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('never returns old bytes during the first render of a different version', async () => {
  fetchMock.mockResolvedValueOnce(new Response('old version'))
  const seen: Array<[string, string]> = []
  function Observed({ version }: { version: string }) {
    const state = useDocumentPreview({ source: { ...source, version_id: version }, format: 'text' })
    useImperativeHandle(preview, () => state)
    seen.push([version, state.status])
    return null
  }
  await act(() => root.render(<Observed version="v1" />))
  await act(() => preview.current?.open())
  expect(seen).toContainEqual(['v1', 'ready'])
  await act(() => root.render(<Observed version="v2" />))
  expect(
    seen.filter(([version]) => version === 'v2').every(([, status]) => status === 'idle'),
  ).toBe(true)
})

test('reports forbidden when renewal cannot replace a denied grant', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))
  await mount({ renew: () => Promise.resolve(undefined) })
  await act(() => preview.current?.open())
  expect(preview.current?.reason).toBe('forbidden')
})
