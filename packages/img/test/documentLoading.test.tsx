// @vitest-environment happy-dom

import type { DocumentViewerProps } from '../src/documentViewer.tsx'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'

import { Viewer } from '../src/viewer.tsx'

test('keeps a failed document chunk inline and retries after reopening', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.doMock('../src/documentViewer.tsx', () => {
    throw new Error('Chunk unavailable')
  })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const onError = vi.fn()
  const bytes = new ArrayBuffer(0)
  await act(() =>
    root.render(
      <Viewer
        kind="document"
        format="text"
        bytes={bytes}
        title="Notes"
        onError={onError}
        errorFallback={<p role="alert">Unavailable</p>}
      />,
    ),
  )
  await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  await act(() => root.render(null))
  vi.doMock('../src/documentViewer.tsx', () => ({
    DocumentViewer: ({ title }: DocumentViewerProps) => <article>{title}</article>,
  }))
  await act(() =>
    root.render(
      <Viewer kind="document" format="text" bytes={bytes} title="Reopened" onError={onError} />,
    ),
  )
  await vi.waitFor(() => expect(container.textContent).toBe('Reopened'))
  expect(onError).toHaveBeenCalledOnce()
  await act(() => root.unmount())
  container.remove()
  vi.doUnmock('../src/documentViewer.tsx')
  vi.unstubAllGlobals()
})
